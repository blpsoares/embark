import { describe, test, expect } from "bun:test";
import { buildMarkdownTable, replaceReadmeSection, processReadmeUpdate } from "../update-readme-packages";

describe("buildMarkdownTable", () => {
  test("returns headers when list is empty", () => {
    const result = buildMarkdownTable([]);
    expect(result).toEqual([
      "| Package | Description |",
      "|---------|-------------|",
    ]);
  });

  test("includes packages in table", () => {
    const packages = [
      { name: "showcase", description: "Showcase website" },
      { name: "myApp", description: "My application" },
    ];
    const result = buildMarkdownTable(packages);
    expect(result).toContain("| `showcase` | Showcase website |");
    expect(result).toContain(
      "| `myApp` | My application |",
    );
  });

  test("formats package name with backticks", () => {
    const packages = [{ name: "my-package", description: "Description" }];
    const result = buildMarkdownTable(packages);
    expect(result[2]).toContain("`my-package`");
  });

  test("keeps multiple packages in order", () => {
    const packages = [
      { name: "p1", description: "Package 1" },
      { name: "p2", description: "Package 2" },
      { name: "p3", description: "Package 3" },
    ];
    const result = buildMarkdownTable(packages);
    expect(result.length).toBe(5); // 2 headers + 3 packages
    expect(result[2]).toContain("p1");
    expect(result[3]).toContain("p2");
    expect(result[4]).toContain("p3");
  });
});

describe("replaceReadmeSection", () => {
  const markerStart = "<!-- PACKAGES:START -->";
  const markerEnd = "<!-- PACKAGES:END -->";

  test("replaces section between markers", () => {
    const readme = `
# README

${markerStart}
| Package | Description |
|---------|-------------|
${markerEnd}

Rest of README
`;
    const newSection = `${markerStart}
| New | Content |
${markerEnd}`;

    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );

    expect(result).toContain("| New | Content |");
    expect(result).toContain("Rest of README");
  });

  test("returns original readme if markers not found", () => {
    const readme = "# README\nNo markers";
    const newSection = "New content";

    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );

    expect(result).toBe(readme);
  });

  test("returns original readme if only start marker not found", () => {
    const readme = `# README\n${markerEnd}\nContent`;
    const newSection = "New content";

    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );

    expect(result).toBe(readme);
  });

  test("returns original readme if only end marker not found", () => {
    const readme = `# README\n${markerStart}\nContent`;
    const newSection = "New content";

    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );

    expect(result).toBe(readme);
  });

  test("preserves content before and after markers", () => {
    const readme = `Start
${markerStart}
Old
${markerEnd}
End`;
    const newSection = `${markerStart}
New
${markerEnd}`;

    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );

    expect(result).toContain("Start");
    expect(result).toContain("New");
    expect(result).toContain("End");
    expect(result).not.toContain("Old");
  });

  test("works with custom markers", () => {
    const start = "<!-- CUSTOM:START -->";
    const end = "<!-- CUSTOM:END -->";
    const readme = `Text\n${start}\nOld\n${end}\nMore text`;
    const newSection = `${start}\nNew content\n${end}`;

    const result = replaceReadmeSection(readme, start, end, newSection);

    expect(result).toContain("New content");
    expect(result).not.toContain("Old");
  });
});

describe("async I/O functions", () => {
  test("getPackages returns list of packages", async () => {
    const { getPackages } = await import("../update-readme-packages");
    const packages = await getPackages();
    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
    packages.forEach((p) => {
      expect(p.name).toBeDefined();
      expect(p.description).toBeDefined();
      expect(typeof p.name).toBe("string");
      expect(typeof p.description).toBe("string");
    });
  });

  test("getPackages sorts packages by name", async () => {
    const { getPackages } = await import("../update-readme-packages");
    const packages = await getPackages();
    for (let i = 0; i < packages.length - 1; i++) {
      expect(packages[i]!.name <= packages[i + 1]!.name).toBe(true);
    }
  });

  test("getPackages uses description from package.json", async () => {
    const { getPackages } = await import("../update-readme-packages");
    const packages = await getPackages();
    const showcase = packages.find((p) => p.name === "showcase");
    expect(showcase).toBeDefined();
    expect(showcase?.description).toBe("Embark showcase website — ship vibe-coded apps with zero-config CI/CD");
  });
});

describe("edge cases for replacement", () => {
  const markerStart = "<!-- START -->";
  const markerEnd = "<!-- END -->";

  test("replaces when markers are on the same line", () => {
    const readme = `Content ${markerStart} old ${markerEnd} more content`;
    const newSection = `${markerStart} new ${markerEnd}`;
    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );
    expect(result).toContain(" new ");
    expect(result).not.toContain(" old ");
  });

  test("replaces when there are multiple markers", () => {
    const readme = `${markerStart}section1${markerEnd}text${markerStart}section2${markerEnd}`;
    const newSection = `${markerStart}new${markerEnd}`;
    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );
    expect(result.indexOf(markerStart)).toBe(0);
  });

  test("preserves line breaks", () => {
    const readme = `${markerStart}\nLine 1\nLine 2\n${markerEnd}`;
    const newSection = `${markerStart}\nNew Line 1\nNew Line 2\n${markerEnd}`;
    const result = replaceReadmeSection(
      readme,
      markerStart,
      markerEnd,
      newSection,
    );
    expect(result).toContain("\nNew Line 1\n");
    expect(result).not.toContain("\nLine 1\n");
  });
});

describe("processReadmeUpdate", () => {
  const markerStart = "<!-- PACKAGES:START -->";
  const markerEnd = "<!-- PACKAGES:END -->";

  test("detects when there is a change", () => {
    const readme = `${markerStart}\n| Package | Description |\n|---------|-------------|\n| \`showcase\` | Old |\n${markerEnd}`;
    const packages = [{ name: "showcase", description: "New" }];

    const result = processReadmeUpdate(readme, packages);
    expect(result.hasChanged).toBe(true);
    expect(result.newContent).toContain("| New |");
  });

  test("detects when there is no change", () => {
    const packages = [{ name: "showcase", description: "Showcase website" }];
    const tableContent = buildMarkdownTable(packages);
    const newSection = [
      markerStart,
      ...tableContent,
      markerEnd,
    ].join("\n");
    const readme = `# README\n\n${newSection}\n\nOther content`;

    const result = processReadmeUpdate(readme, packages);
    expect(result.hasChanged).toBe(false);
    expect(result.newContent).toBe(readme);
  });

  test("generates new content with multiple packages", () => {
    const readme = `${markerStart}${markerEnd}`;
    const packages = [
      { name: "showcase", description: "Showcase" },
      { name: "calculator", description: "Calc" },
    ];

    const result = processReadmeUpdate(readme, packages);
    expect(result.hasChanged).toBe(true);
    expect(result.newContent).toContain("| `showcase` | Showcase |");
    expect(result.newContent).toContain("| `calculator` | Calc |");
  });

  test("returns false if markers not found", () => {
    const readme = "# README\nNo markers";
    const packages = [{ name: "showcase", description: "Showcase" }];

    const result = processReadmeUpdate(readme, packages);
    expect(result.hasChanged).toBe(false);
    expect(result.newContent).toBe(readme);
  });

  test("preserves content before and after markers", () => {
    const readme = `# Title

${markerStart}
old table
${markerEnd}

## Final section
Final content`;
    const packages = [{ name: "new", description: "New package" }];

    const result = processReadmeUpdate(readme, packages);
    expect(result.hasChanged).toBe(true);
    expect(result.newContent).toContain("# Title");
    expect(result.newContent).toContain("## Final section");
    expect(result.newContent).toContain("Final content");
  });
});
