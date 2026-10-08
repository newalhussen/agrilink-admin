import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CircleCheck, Pencil, Plus, Sprout } from "lucide-react";
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/dialogs";
import { AuthImage, EmptyState, ErrorState, KeyValue, PageHeader, Pager, SearchBox, SegTabs, StatusTag, TableSkeleton, useDebounced } from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { LISTING_STATUS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { Category, Listing, Page, ProductSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "catalogue" ? "catalogue" : "listings";
  return (
    <>
      <PageHeader
        title="Products & listings"
        actions={
          <SegTabs
            label="Section"
            value={tab}
            onChange={(v) => setParams(v === "catalogue" ? { tab: "catalogue" } : {}, { replace: true })}
            options={[{ value: "listings", label: "Farmer listings" }, { value: "catalogue", label: "Catalogue" }]}
          />
        }
      />
      {tab === "listings" ? <ListingsTab /> : <CatalogueTab />}
    </>
  );
}

const STATUS_FILTER = ["ALL", "ACTIVE", "DRAFT", "PAUSED", "SOLD_OUT", "SUSPENDED", "EXPIRED", "REMOVED"];

function ListingsTab() {
  const [status, setStatus] = React.useState("ALL");
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<Listing | null>(null);
  const term = useDebounced(q);
  React.useEffect(() => setPage(0), [status, term]);
  const query = useQuery({
    queryKey: ["listings", status, term, page],
    queryFn: () => api.get<Page<Listing>>("/admin/listings", { status: status === "ALL" ? undefined : status, q: term || undefined, page, size: 20 }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Title, product or farmer" />
        <SimpleSelect className="w-48" value={status} onValueChange={setStatus} options={STATUS_FILTER.map((s) => ({ value: s, label: s === "ALL" ? "All statuses" : LISTING_STATUS[s]?.label ?? s }))} />
      </div>
      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState icon={<Sprout className="size-6" />} title="No listings" hint="Listings appear here as farmers add produce." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="ds-table min-w-[900px]">
              <thead><tr><th>Listing</th><th>Farmer</th><th>Grade</th><th className="text-right">Price</th><th className="text-right">Available</th><th>Status</th><th>Posted</th></tr></thead>
              <tbody>
                {query.data?.items.map((l) => (
                  <tr key={l.id} className="clickable" onClick={() => setSelected(l)}>
                    <td><b>{l.title}</b><div className="text-xs text-sand-700">{l.product.nameEn} · {[l.address?.town, l.address?.regionName].filter(Boolean).join(", ")}</div></td>
                    <td>{l.farmer.farmName ?? l.farmer.fullName}{l.farmer.verified ? null : <Tag tone="outline" className="ml-2">unverified</Tag>}</td>
                    <td>{l.qualityGrade}{l.organic ? " · organic" : ""}</td>
                    <td className="tabular text-right">{formatMoney(l.pricePerUnit, { currency: false })} / {l.unit.toLowerCase()}</td>
                    <td className="tabular text-right">{Number(l.quantityAvailable)} / {Number(l.quantityTotal)} {l.unit.toLowerCase()}</td>
                    <td><StatusTag status={l.status} map={LISTING_STATUS} /></td>
                    <td>{formatDate(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data ? <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} /> : null}
        </>
      )}
      <ListingDialog listing={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ListingDialog({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = React.useState<"SUSPENDED" | "REMOVED" | "ACTIVE" | null>(null);
  const change = useMutation({
    mutationFn: (status: string) => api.patch<Listing>(`/admin/listings/${listing!.id}/status`, { status }),
    onSuccess: (_l, status) => {
      toast.success(status === "ACTIVE" ? "Listing reinstated" : status === "SUSPENDED" ? "Listing suspended" : "Listing removed");
      setConfirm(null);
      onClose();
      void qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!listing) return null;
  const cover = listing.photos.find((p) => p.primary) ?? listing.photos[0];
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent wide>
          <DialogHeader>
            <DialogTitle>{listing.title}</DialogTitle>
            <DialogDescription>{listing.product.categoryName} · {listing.product.nameEn}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div className="grid h-44 place-items-center overflow-hidden rounded-3xl bg-sand-300 text-sand-700">
              {cover ? <AuthImage src={cover.url} alt={listing.title} fallback={<Sprout className="size-8" />} /> : <Sprout className="size-8" />}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <KeyValue label="Status"><StatusTag status={listing.status} map={LISTING_STATUS} /></KeyValue>
              <KeyValue label="Farmer"><Link to={`/users/${listing.farmer.id}`} className="font-bold">{listing.farmer.farmName ?? listing.farmer.fullName}</Link></KeyValue>
              <KeyValue label="Price">{formatMoney(listing.pricePerUnit)} / {listing.unit.toLowerCase()}</KeyValue>
              <KeyValue label="Available">{Number(listing.quantityAvailable)} of {Number(listing.quantityTotal)} {listing.unit.toLowerCase()} (min {Number(listing.minOrderQuantity)})</KeyValue>
              <KeyValue label="Quality">Grade {listing.qualityGrade}{listing.organic ? " · organic" : ""}</KeyValue>
              <KeyValue label="Packaging">{listing.packaging ?? "—"}</KeyValue>
              <KeyValue label="Harvested">{formatDate(listing.harvestDate)}</KeyValue>
              <KeyValue label="Available from">{formatDate(listing.availableFrom)}</KeyValue>
              <KeyValue label="Collect from" className="col-span-2">{[listing.address?.addressLine, listing.address?.town, listing.address?.zone, listing.address?.regionName].filter(Boolean).join(", ") || "—"}</KeyValue>
            </div>
          </div>
          {listing.description || listing.qualityNotes ? (
            <p className="rounded-3xl bg-background px-4 py-3 text-sm">{[listing.description, listing.qualityNotes].filter(Boolean).join(" · ")}</p>
          ) : null}
          <DialogFooter>
            {listing.status === "SUSPENDED" || listing.status === "PAUSED" || listing.status === "EXPIRED" ? (
              <Button variant="sage" onClick={() => setConfirm("ACTIVE")}><CircleCheck />Reinstate</Button>
            ) : null}
            {listing.status !== "SUSPENDED" && listing.status !== "REMOVED" ? <Button variant="secondary" onClick={() => setConfirm("SUSPENDED")}><Ban />Suspend</Button> : null}
            {listing.status !== "REMOVED" ? <Button variant="danger" onClick={() => setConfirm("REMOVED")}>Remove</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm === "ACTIVE" ? "sage" : "danger"}
        title={confirm === "ACTIVE" ? "Reinstate this listing?" : confirm === "SUSPENDED" ? "Suspend this listing?" : "Remove this listing?"}
        description={confirm === "ACTIVE" ? "It becomes visible to buyers again." : "Buyers can no longer see or order it. Existing orders are not affected. The farmer cannot undo a suspension."}
        confirmLabel={confirm === "ACTIVE" ? "Reinstate" : confirm === "SUSPENDED" ? "Suspend" : "Remove"}
        pending={change.isPending} onConfirm={() => confirm && change.mutate(confirm)}
      />
    </>
  );
}

function CatalogueTab() {
  const qc = useQueryClient();
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: () => api.get<Category[]>("/admin/categories") });
  const products = useQuery({ queryKey: ["admin-products"], queryFn: () => api.get<ProductSummary[]>("/admin/products") });
  const [editCategory, setEditCategory] = React.useState<Category | "new" | null>(null);
  const [editProduct, setEditProduct] = React.useState<ProductSummary | "new" | null>(null);
  const [filter, setFilter] = React.useState("ALL");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
  };
  const shown = (products.data ?? []).filter((p) => filter === "ALL" || p.categoryId === filter);

  return (
    <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-3"><h4 className="flex-1">Categories</h4><Button size="sm" variant="secondary" onClick={() => setEditCategory("new")}><Plus />Add</Button></div>
        {categories.isLoading ? <TableSkeleton rows={4} cols={1} /> : categories.isError ? <ErrorState error={categories.error} /> : (
          <ul className="flex flex-col">
            <li>
              <button type="button" onClick={() => setFilter("ALL")} className={cn("flex w-full items-center rounded-full px-4 py-2 text-left text-sm", filter === "ALL" ? "bg-terra-200 font-bold" : "hover:bg-foreground/[0.05]")}>All products<span className="ml-auto text-sand-700">{products.data?.length ?? ""}</span></button>
            </li>
            {categories.data?.map((c) => (
              <li key={c.id} className="group flex items-center">
                <button type="button" onClick={() => setFilter(c.id)} className={cn("flex flex-1 items-center gap-2 rounded-full px-4 py-2 text-left text-sm", filter === c.id ? "bg-terra-200 font-bold" : "hover:bg-foreground/[0.05]")}>
                  {c.nameEn}{!c.active ? <Tag tone="outline">hidden</Tag> : null}
                  <span className="ml-auto text-sand-700">{products.data?.filter((p) => p.categoryId === c.id).length ?? ""}</span>
                </button>
                <Button size="icon" variant="ghost" aria-label={`Edit ${c.nameEn}`} onClick={() => setEditCategory(c)}><Pencil /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-3"><h4 className="flex-1">Products</h4><Button size="sm" onClick={() => setEditProduct("new")}><Plus />Add product</Button></div>
        {products.isLoading ? <TableSkeleton /> : products.isError ? <ErrorState error={products.error} /> : (
          <div className="overflow-x-auto">
            <table className="ds-table min-w-[620px]">
              <thead><tr><th>Product</th><th>አማርኛ</th><th>Afaan Oromoo</th><th>Category</th><th>Unit</th><th /></tr></thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.nameEn}</b>{!p.active ? <Tag tone="outline" className="ml-2">hidden</Tag> : null}</td>
                    <td lang="am">{p.nameAm ?? "—"}</td>
                    <td>{p.nameOm ?? "—"}</td>
                    <td>{p.categoryName}</td>
                    <td>{p.defaultUnit.toLowerCase()}</td>
                    <td className="text-right"><Button size="icon" variant="ghost" aria-label={`Edit ${p.nameEn}`} onClick={() => setEditProduct(p)}><Pencil /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <CategoryDialog value={editCategory} onClose={() => setEditCategory(null)} onSaved={refresh} />
      <ProductDialog value={editProduct} categories={categories.data ?? []} onClose={() => setEditProduct(null)} onSaved={refresh} />
    </div>
  );
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function CategoryDialog({ value, onClose, onSaved }: { value: Category | "new" | null; onClose: () => void; onSaved: () => void }) {
  const existing = value && value !== "new" ? value : null;
  const [f, setF] = React.useState({ slug: "", nameEn: "", nameAm: "", nameOm: "", icon: "", sortOrder: "0", active: true });
  React.useEffect(() => {
    if (value) setF(existing ? { slug: existing.slug, nameEn: existing.nameEn, nameAm: existing.nameAm ?? "", nameOm: existing.nameOm ?? "", icon: existing.icon ?? "", sortOrder: String(existing.sortOrder), active: existing.active } : { slug: "", nameEn: "", nameAm: "", nameOm: "", icon: "", sortOrder: "0", active: true });
  }, [value, existing]);
  const save = useMutation({
    mutationFn: () => {
      const body = { slug: f.slug, nameEn: f.nameEn, nameAm: f.nameAm || null, nameOm: f.nameOm || null, icon: f.icon || null, sortOrder: Number(f.sortOrder) || 0, active: f.active };
      return existing ? api.put(`/admin/categories/${existing.id}`, body) : api.post("/admin/categories", body);
    },
    onSuccess: () => { toast.success("Category saved"); onSaved(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <Field label="Name (English)"><Input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value, slug: existing ? f.slug : slugify(e.target.value) })} /></Field>
        <Field label="አማርኛ"><Input lang="am" value={f.nameAm} onChange={(e) => setF({ ...f, nameAm: e.target.value })} /></Field>
        <Field label="Afaan Oromoo"><Input value={f.nameOm} onChange={(e) => setF({ ...f, nameOm: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slug" hint={existing ? "Cannot be changed" : undefined}><Input value={f.slug} disabled={!!existing} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
          <Field label="Sort order"><Input inputMode="numeric" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4 accent-[var(--color-accent)]" />Visible to farmers and buyers</label>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || !f.nameEn.trim() || !f.slug} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const UNITS = ["KG", "QUINTAL", "TON", "LITER", "CRATE", "SACK", "TRAY", "BUNCH", "PIECE"];

function ProductDialog({ value, categories, onClose, onSaved }: { value: ProductSummary | "new" | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const existing = value && value !== "new" ? value : null;
  const [f, setF] = React.useState({ slug: "", nameEn: "", nameAm: "", nameOm: "", categoryId: "", defaultUnit: "KG", description: "", active: true });
  React.useEffect(() => {
    if (value) setF(existing ? { slug: existing.slug, nameEn: existing.nameEn, nameAm: existing.nameAm ?? "", nameOm: existing.nameOm ?? "", categoryId: existing.categoryId, defaultUnit: existing.defaultUnit, description: existing.description ?? "", active: existing.active } : { slug: "", nameEn: "", nameAm: "", nameOm: "", categoryId: categories[0]?.id ?? "", defaultUnit: "KG", description: "", active: true });
  }, [value, existing, categories]);
  const save = useMutation({
    mutationFn: () => {
      const body = { slug: f.slug, categoryId: f.categoryId, nameEn: f.nameEn, nameAm: f.nameAm || null, nameOm: f.nameOm || null, defaultUnit: f.defaultUnit, description: f.description || null, active: f.active };
      return existing ? api.put(`/admin/products/${existing.id}`, body) : api.post("/admin/products", body);
    },
    onSuccess: () => { toast.success("Product saved"); onSaved(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <Field label="Name (English)"><Input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value, slug: existing ? f.slug : slugify(e.target.value) })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="አማርኛ"><Input lang="am" value={f.nameAm} onChange={(e) => setF({ ...f, nameAm: e.target.value })} /></Field>
          <Field label="Afaan Oromoo"><Input value={f.nameOm} onChange={(e) => setF({ ...f, nameOm: e.target.value })} /></Field>
        </div>
        <Field label="Category">
          <SimpleSelect value={f.categoryId} onValueChange={(v) => setF({ ...f, categoryId: v })} options={categories.map((c) => ({ value: c.id, label: c.nameEn }))} placeholder="Choose a category" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default selling unit"><SimpleSelect value={f.defaultUnit} onValueChange={(v) => setF({ ...f, defaultUnit: v })} options={UNITS.map((u) => ({ value: u, label: u.toLowerCase() }))} /></Field>
          <Field label="Slug" hint={existing ? "Cannot be changed" : undefined}><Input value={f.slug} disabled={!!existing} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-4 accent-[var(--color-accent)]" />Farmers can list this product</label>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || !f.nameEn.trim() || !f.slug || !f.categoryId} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
