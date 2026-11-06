
/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCart } from "../hooks/useCart";

describe("useCart", () => {
  it("lanza un error si se utiliza fuera de CartProvider", () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow(
      "useCart debe utilizarse dentro de CartProvider"
    );
  });
});
