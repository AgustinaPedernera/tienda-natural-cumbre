
/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCart } from "../hooks/useCart";

vi.mock("../config/firebase", () => ({ auth: {}, db: {} }));

describe("useCart", () => {
  it("lanza un error si se utiliza fuera de CartProvider", () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow(
      "useCart debe utilizarse dentro de CartProvider"
    );
  });
});

