import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the xlsx module before importing the implementation
vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: vi.fn((data: unknown[]) => ({ data })),
    book_append_sheet: vi.fn((wb: { SheetNames: string[]; Sheets: Record<string, unknown> }, ws: unknown, name: string) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = ws;
    }),
  },
  writeFile: vi.fn(),
}));

import * as XLSX from "xlsx";
import { exportToExcel, downloadExcel } from "@/lib/excel-export";

describe("exportToExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a workbook with the correct sheet name", () => {
    const data = [{ col1: "a", col2: "b" }];
    exportToExcel(data, "MySheet", "output.xlsx");

    expect(XLSX.utils.book_new).toHaveBeenCalledOnce();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "MySheet",
    );
  });

  it("auto-appends .xlsx extension when missing", () => {
    const data = [{ id: 1 }];
    exportToExcel(data, "Sheet1", "myfile");

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "myfile.xlsx",
    );
  });

  it("does NOT double-append .xlsx when extension is already present", () => {
    const data = [{ id: 1 }];
    exportToExcel(data, "Sheet1", "myfile.xlsx");

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "myfile.xlsx",
    );
    // Ensure it was not called with "myfile.xlsx.xlsx"
    const callArg = (XLSX.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(callArg).not.toBe("myfile.xlsx.xlsx");
  });

  it("converts data to a worksheet and adds it to the workbook", () => {
    const data = [{ name: "Alice", amount: 100 }];
    exportToExcel(data, "Investors", "report.xlsx");

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(data);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledOnce();
  });
});

describe("downloadExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to exportToExcel using 'Data' as sheet name", () => {
    const data = [{ value: 42 }];
    downloadExcel(data, "report");

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Data",
    );
  });

  it("still auto-appends .xlsx extension via exportToExcel", () => {
    const data = [{ value: 1 }];
    downloadExcel(data, "export");

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "export.xlsx",
    );
  });
});
