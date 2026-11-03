/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { applyGrant } from "@/lib/grants";

describe("presentes e alterações do admin", () => {
  it("nível fica entre 1 e 50", () => {
    const s: any = { level: 5, maxHp: 150 };
    applyGrant(s, { kind: "level", payload: { level: 99 } });
    expect(s.level).toBe(50);
    applyGrant(s, { kind: "level", payload: { level: -3 } });
    expect(s.level).toBe(1);
  });

  it("definir Gold troca o valor; somar adiciona; nunca fica negativo", () => {
    const s: any = { gold: 100 };
    applyGrant(s, { kind: "gold", payload: { mode: "set", amount: 5000 } });
    expect(s.gold).toBe(5000);
    applyGrant(s, { kind: "gold", payload: { mode: "add", amount: 250 } });
    expect(s.gold).toBe(5250);
    applyGrant(s, { kind: "gold", payload: { mode: "add", amount: -99999 } });
    expect(s.gold).toBe(0);
  });

  it("presente de material soma na bolsa", () => {
    const s: any = { resources: { diamond: 2 } };
    applyGrant(s, { kind: "resource", payload: { id: "diamond", qty: 10 } });
    expect(s.resources.diamond).toBe(12);
  });

  it("item que não existe no jogo é ignorado", () => {
    const s: any = { resources: {} };
    expect(applyGrant(s, { kind: "resource", payload: { id: "hack", qty: 10 } })).toBeNull();
    expect(s.resources.hack).toBeUndefined();
  });
});
