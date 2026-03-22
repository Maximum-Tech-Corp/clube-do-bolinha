import { vi } from "vitest";

// next/navigation
export const mockPush = vi.fn();
export const mockReplace = vi.fn();
export const mockRedirect = vi.fn();
export const mockNotFound = vi.fn();
export const mockUsePathname = vi.fn(() => "/");
export const mockUseSearchParams = vi.fn(() => new URLSearchParams());
export const mockUseParams = vi.fn(() => ({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
  useParams: mockUseParams,
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

// next/cache
export const mockRevalidatePath = vi.fn();
export const mockRevalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: mockRevalidateTag,
}));

// next/headers
export const mockCookieGet = vi.fn();
export const mockCookieSet = vi.fn();
export const mockCookieDelete = vi.fn();
export const mockCookieGetAll = vi.fn(() => []);

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookieGet,
      set: mockCookieSet,
      delete: mockCookieDelete,
      getAll: mockCookieGetAll,
    })
  ),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));
