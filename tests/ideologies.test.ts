import { expect, test } from "bun:test";
import dataset from "../data/ideologies.json";
import { resolveIdeology } from "@/server/ideologies";
import { validateDataset } from "../scripts/fetch-ideologies";

const expected = {
  liberalism: "Q6216", communism: "Q6186", zionism: "Q42388", "anti-zionism": "Q584548",
  "turkish-nationalism": "Q3568928", "kurdish-nationalism": "Q7057435", "pan-turkism": "Q83280",
  kemalism: "Q269443", "christian-zionism": "Q1084152",
};

test("required ideology fixtures are canonically mapped", () => {
  const byId = new Map(dataset.ideologies.map((item) => [item.id, item]));
  for (const [id, qid] of Object.entries(expected)) {
    const item = byId.get(id); expect(item).toBeDefined(); expect(item?.qid).toBe(qid); expect(item?.name.en.trim()).not.toBe(""); expect(item?.name.tr.trim()).not.toBe("");
  }
  expect(byId.get("anti-zionism")?.opposes).toContain("zionism");
  expect(byId.get("zionism")?.opposes).toContain("anti-zionism");
});

test("dataset graph and submitted ideology values are valid", () => {
  expect(validateDataset(dataset)).toEqual([]);
  expect(resolveIdeology("Kemalizm")).toBe("kemalism");
  expect(resolveIdeology("not-an-ideology")).toBeNull();
});
