import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, employeeProcedure } from "../trpc/init";
import {
  generatePkpass,
  generateGoogleWalletSaveUrl,
} from "@employee-tracker/passes";

function generateQrToken(): string {
  return crypto.randomUUID().toUpperCase().replace(/-/g, "");
}

export const passesRouter = createTRPCRouter({
  // Returns the employee's active QR pass status, or null if none issued.
  getPassStatus: employeeProcedure.query(async ({ ctx }) => {
    if (!ctx.currentEmployeeId) return null;
    const tag = await ctx.db.tag.findFirst({
      where: {
        employeeId: ctx.currentEmployeeId,
        passType: "QR_WALLET",
        isActive: true,
      },
    });
    if (!tag) return null;
    return { tagId: tag.tagId, passIssuedAt: tag.passIssuedAt };
  }),

  // Issue a new QR wallet pass. Errors if the employee already has an active pass —
  // contact an admin to revoke it first.
  requestPass: employeeProcedure
    .input(z.object({ passType: z.enum(["apple", "google"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentEmployeeId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No employee profile linked." });
      }

      const existing = await ctx.db.tag.findFirst({
        where: {
          employeeId: ctx.currentEmployeeId,
          passType: "QR_WALLET",
          isActive: true,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Pass already issued. Contact your administrator to revoke it before requesting a new one.",
        });
      }

      const employee = await ctx.db.employee.findUniqueOrThrow({
        where: { id: ctx.currentEmployeeId },
      });

      const tagId = generateQrToken();

      await ctx.db.tag.create({
        data: {
          tagId,
          employeeId: ctx.currentEmployeeId,
          passType: "QR_WALLET",
          passIssuedAt: new Date(),
          isActive: true,
          label: "QR Wallet Pass",
        },
      });

      if (input.passType === "apple") {
        const pkpassBuffer = await generatePkpass(employee, tagId);
        return {
          passType: "apple" as const,
          data: pkpassBuffer.toString("base64"),
        };
      } else {
        const saveUrl = await generateGoogleWalletSaveUrl(employee, tagId);
        return { passType: "google" as const, saveUrl };
      }
    }),

  // Re-download the existing active pass without creating a new token.
  // Useful when adding the pass to a second device.
  downloadPass: employeeProcedure
    .input(z.object({ passType: z.enum(["apple", "google"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.currentEmployeeId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No employee profile linked." });
      }

      const tag = await ctx.db.tag.findFirst({
        where: {
          employeeId: ctx.currentEmployeeId,
          passType: "QR_WALLET",
          isActive: true,
        },
      });

      if (!tag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active pass found. Request a pass first.",
        });
      }

      const employee = await ctx.db.employee.findUniqueOrThrow({
        where: { id: ctx.currentEmployeeId },
      });

      if (input.passType === "apple") {
        const pkpassBuffer = await generatePkpass(employee, tag.tagId);
        return {
          passType: "apple" as const,
          data: pkpassBuffer.toString("base64"),
        };
      } else {
        const saveUrl = await generateGoogleWalletSaveUrl(employee, tag.tagId);
        return { passType: "google" as const, saveUrl };
      }
    }),

  // Admin: revoke all active QR passes for an employee.
  // After revocation the employee can call requestPass to get a fresh token.
  revokePass: adminProcedure
    .input(z.object({ employeeId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.tag.updateMany({
        where: {
          employeeId: input.employeeId,
          passType: "QR_WALLET",
          isActive: true,
        },
        data: { isActive: false },
      });
      return { revokedCount: result.count };
    }),
});
