import { describe, test, expect } from "bun:test";

describe("package name validation", () => {
  function validateCamelCase(name: string): boolean {
    return /^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$/.test(name);
  }

  function convertToCamelCase(name: string): string {
    return name
      .split("-")
      .map((part, idx) =>
        idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join("");
  }

  test("validates valid camelCase names", () => {
    expect(validateCamelCase("myPackage")).toBe(true);
    expect(validateCamelCase("showcase")).toBe(true);
    expect(validateCamelCase("calculator")).toBe(true);
  });

  test("validates valid kebab-case names", () => {
    expect(validateCamelCase("my-package")).toBe(true);
    expect(validateCamelCase("new-package-test")).toBe(true);
    expect(validateCamelCase("app-test")).toBe(true);
  });

  test("rejects invalid names", () => {
    expect(validateCamelCase("My-Package")).toBe(false); // Starts with uppercase
    expect(validateCamelCase("my_package")).toBe(false); // Uses underscore
    expect(validateCamelCase("my package")).toBe(false); // Has space
    expect(validateCamelCase("123-package")).toBe(false); // Starts with number
    expect(validateCamelCase("")).toBe(false); // Empty
  });

  test("converts kebab-case to camelCase", () => {
    expect(convertToCamelCase("my-package")).toBe("myPackage");
    expect(convertToCamelCase("new-test-package")).toBe("newTestPackage");
    expect(convertToCamelCase("showcase")).toBe("showcase");
  });

  test("keeps valid camelCase as-is", () => {
    expect(convertToCamelCase("myPackage")).toBe("myPackage");
    expect(convertToCamelCase("calculator")).toBe("calculator");
  });
});
