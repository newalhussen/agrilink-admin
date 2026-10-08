import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/auth/AuthProvider";
import { Pager, SegTabs, StatusTag } from "@/components/common/parts";
import { ORDER_STATUS } from "@/lib/constants";
import { LoginPage } from "@/pages/LoginPage";

describe("SegTabs", () => {
  it("marks the active option and reports changes", async () => {
    const onChange = vi.fn();
    render(
      <SegTabs
        label="Role"
        value="FARMER"
        onChange={onChange}
        options={[{ value: "FARMER", label: "Farmers", count: 9 }, { value: "BUYER", label: "Buyers", count: 3 }]}
      />,
    );
    expect(screen.getByRole("radio", { name: /Farmers/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: /Buyers/ }));
    expect(onChange).toHaveBeenCalledWith("BUYER");
  });
});

describe("StatusTag", () => {
  it("shows the human label for every order status", () => {
    render(<StatusTag status="DISPUTED" map={ORDER_STATUS} />);
    expect(screen.getByText("In dispute")).toBeInTheDocument();
  });

  it("falls back to the raw value for unknown statuses", () => {
    render(<StatusTag status="MYSTERY" map={ORDER_STATUS} />);
    expect(screen.getByText("MYSTERY")).toBeInTheDocument();
  });
});

describe("Pager", () => {
  it("summarises the range and disables edges", async () => {
    const onPage = vi.fn();
    render(<Pager page={0} size={20} totalItems={45} totalPages={3} onPage={onPage} />);
    expect(screen.getByText("1–20 of 45")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it("renders nothing when empty", () => {
    const { container } = render(<Pager page={0} size={20} totalItems={0} totalPages={0} onPage={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LoginPage", () => {
  function renderLogin() {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("rejects non-admin accounts with a clear message", async () => {
    localStorage.clear();
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/login")
          ? new Response(JSON.stringify({ accessToken: "a", refreshToken: "r", user: { role: "FARMER" } }), { status: 200 })
          : new Response(null, { status: 204 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderLogin();
    await userEvent.type(screen.getByLabelText("Phone number"), "0911000001");
    await userEvent.type(screen.getByLabelText("Password"), "Demo@12345");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("operations staff only");
    expect(localStorage.getItem("agrilink.admin.access")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("keeps the submit button disabled until both fields are filled", async () => {
    renderLogin();
    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Phone number"), "0900000000");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Password"), "x");
    expect(button).toBeEnabled();
  });
});
