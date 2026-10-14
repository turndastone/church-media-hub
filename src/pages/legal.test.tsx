import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import Legal, { type LegalDoc } from "./Legal";

function render(doc: LegalDoc) {
  return renderToString(
    <StaticRouter location={doc === "terms" ? "/terms" : "/privacy"}>
      <Legal doc={doc} />
    </StaticRouter>,
  );
}

const terms = render("terms");
const privacy = render("privacy");

describe("Terms of Use page", () => {
  it("renders the title and effective date", () => {
    expect(terms).toContain("Terms of Use");
    expect(terms).toContain("Last updated");
    expect(terms).toContain("October 14, 2026");
  });

  it("renders all twelve sections", () => {
    const headings = [...terms.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map(
      (m) => m[1],
    );
    expect(headings).toHaveLength(12);
    expect(headings[0]).toContain("Acceptance of these terms");
    expect(headings[11]).toContain("Contact us");
  });

  it("every table-of-contents link points at a section that exists", () => {
    const anchors = [...terms.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(anchors.length).toBe(12);
    for (const anchor of anchors) {
      expect(terms).toContain(`id="${anchor}"`);
    }
  });

  it("links to the privacy policy, not to another site", () => {
    const links = [...terms.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(links).toContain("/privacy");
    expect(links.every((href) => href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:"))).toBe(true);
  });

  it("tells members how to reach the parish", () => {
    expect(terms).toContain("mailto:rccgsolutionambassador@gmail.com");
  });
});

describe("Privacy Policy page", () => {
  it("renders the title and effective date", () => {
    expect(privacy).toContain("Privacy Policy");
    expect(privacy).toContain("October 14, 2026");
  });

  it("renders all twelve sections", () => {
    const headings = [...privacy.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map(
      (m) => m[1],
    );
    expect(headings).toHaveLength(12);
    expect(headings[0]).toContain("Our commitment");
    expect(headings[11]).toContain("Contact us");
  });

  it("every table-of-contents link points at a section that exists", () => {
    const anchors = [...privacy.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(anchors.length).toBe(12);
    for (const anchor of anchors) {
      expect(privacy).toContain(`id="${anchor}"`);
    }
  });

  it("explains what is collected and that data is not sold", () => {
    expect(privacy).toMatch(/Information we collect/);
    expect(privacy).toMatch(/never sell/i);
  });

  it("links to the terms of use", () => {
    const links = [...privacy.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(links).toContain("/terms");
  });
});
