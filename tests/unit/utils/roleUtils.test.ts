import { describe, expect, it } from "vitest";
import { canAccessSection, ROLES } from "../../../src/shared/utils/roleUtils";

describe("roleUtils", () => {
	it("denies settings access for technicians", () => {
		expect(canAccessSection(ROLES.TECHNICIAN, "configuracion")).toBe(false);
		expect(canAccessSection(ROLES.TECHNICIAN_ALT, "configuracion")).toBe(false);
	});

	it("allows settings access for tenant admins", () => {
		expect(canAccessSection(ROLES.ADMIN, "configuracion")).toBe(true);
	});
});
