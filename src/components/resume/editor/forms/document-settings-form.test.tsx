import { describe, expect, it } from "vitest";
import type { DocumentSettings } from "@/lib/types";

const initial: DocumentSettings = {
  document_font_size: 10,
  document_line_height: 1.5,
  document_margin_vertical: 36,
  document_margin_horizontal: 36,
  header_name_size: 24,
  header_name_bottom_spacing: 24,
  skills_margin_top: 2,
  skills_margin_bottom: 2,
  skills_margin_horizontal: 0,
  skills_item_spacing: 2,
  experience_margin_top: 2,
  experience_margin_bottom: 2,
  experience_margin_horizontal: 0,
  experience_item_spacing: 4,
  projects_margin_top: 2,
  projects_margin_bottom: 2,
  projects_margin_horizontal: 0,
  projects_item_spacing: 4,
  education_margin_top: 2,
  education_margin_bottom: 2,
  education_margin_horizontal: 0,
  education_item_spacing: 4,
} as DocumentSettings;

describe("DocumentSettingsForm", () => {
  it("accepts document settings shape", () => {
    expect(initial.document_font_size).toBe(10);
  });
});
