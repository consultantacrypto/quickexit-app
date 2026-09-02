"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { getPricingMode, type PricingMode } from "@/lib/pricingMode";
import { premiumSellerConfig } from "@/lib/premiumSeller";
import { financingConfig } from "@/lib/financingConfig";
import { LISTING_AUTO_CATEGORY } from "@/lib/listingPremium";
import ListingPhotoEditor from "@/app/components/ListingPhotoEditor";
import CarBrandCombobox from "@/app/components/CarBrandCombobox";
import { buildListingImagesPatch, sanitizeListingImageUrls } from "@/lib/listingImageUpload";

function EditAdPage() {
  const tPost = useTranslations("PostListing");
  const tPremium = useTranslations("ListingDetail.premiumSeller");
  const tFinancing = useTranslations("ListingDetail.financing");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessError, setAccessError] = useState<"auth" | "forbidden" | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [category, setCategory] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("evaluated");
  const [initialPricingMode, setInitialPricingMode] = useState<PricingMode>("evaluated");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [listingImages, setListingImages] = useState<string[]>([]);

  const detailStr = (key: string) => {
    const value = formData[key];
    return value == null ? "" : String(value);
  };

  const isOwner = currentUserId === premiumSellerConfig.ownerUserId;

  useEffect(() => {
    async function fetchAd() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        setAccessError("auth");
        setIsLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setAccessError("forbidden");
        setIsLoading(false);
        return;
      }

      setCategory(data.category);
      setAdTitle(data.title);
      setDescription(data.description);
      setExitPrice(
        data.exit_price != null &&
          Number.isFinite(Number(data.exit_price)) &&
          Number(data.exit_price) > 0
          ? String(data.exit_price)
          : "",
      );
      const details = data.details || {};
      const mode = getPricingMode(details);
      setPricingMode(mode);
      setInitialPricingMode(mode);
      setFormData(
        details && typeof details === "object" && !Array.isArray(details)
          ? (details as Record<string, unknown>)
          : {},
      );
      setListingImages(sanitizeListingImageUrls(data.images));
      setAccessError(null);
      setIsLoading(false);
    }
    void fetchAd();
  }, [id]);

  const handleUpdate = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    const imagePatch = buildListingImagesPatch(listingImages);
    if ("error" in imagePatch) {
      setSaveError(tPost("photoEditor.errors.keepLast"));
      setIsSaving(false);
      return;
    }
    const trimmedExit = exitPrice.trim();
    const mergedDetails: Record<string, unknown> = { ...formData, pricing_mode: pricingMode };

    if (isOwner) {
      mergedDetails.premium_seller_enabled = formData.premium_seller_enabled === true;
      if (category === LISTING_AUTO_CATEGORY) {
        mergedDetails.vehicle_reviewed = formData.vehicle_reviewed === true;
        mergedDetails.financing_enabled = formData.financing_enabled === true;
        if (formData.financing_enabled === true) {
          mergedDetails.financing_partner = financingConfig.partnerId;
        }
      }
    }

    const updatePayload: {
      title: string;
      description: string;
      details: Record<string, unknown>;
      images?: string[];
      exit_price?: number | null;
      market_price?: number | null;
      discount?: number | null;
      deal_score?: number | null;
    } = {
      title: adTitle,
      description: description,
      details: mergedDetails,
      images: imagePatch.images,
    };

    if (pricingMode === "evaluated") {
      if (trimmedExit) {
        const parsed = Number(trimmedExit);
        if (Number.isFinite(parsed) && parsed > 0) {
          updatePayload.exit_price = parsed;
        }
      }
    } else if (pricingMode === "fixed_price") {
      const parsed = Number(trimmedExit);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setSaveError(tPost("pricingMode.validation.fixedPriceRequired"));
        setIsSaving(false);
        return;
      }
      updatePayload.exit_price = parsed;
      updatePayload.market_price = null;
      updatePayload.discount = null;
      updatePayload.deal_score = null;
    } else {
      updatePayload.exit_price = null;
      updatePayload.market_price = null;
      updatePayload.discount = null;
      updatePayload.deal_score = null;
    }
    if (!currentUserId) {
      setAccessError("auth");
      setIsSaving(false);
      return;
    }
    const { error } = await supabase
      .from("listings")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", currentUserId);

    if (error) {
      setSaveError(tPost("photoEditor.errors.saveFailed"));
    } else {
      router.push("/dashboard");
    }
    setIsSaving(false);
  };

  const updateField = (key: string, value: string) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
  };

  const updateBooleanField = (key: string, value: boolean) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <Loader2 className="animate-spin mr-2" />
      <span className="font-black uppercase tracking-widest text-xs">Se încarcă datele terminalului...</span>
    </div>
  );

  if (accessError) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 pt-16 font-sans text-black">
        <div className="mx-auto max-w-lg rounded-2xl border-[3px] border-black bg-white p-8">
          <h1 className="text-2xl font-black uppercase italic">
            {accessError === "auth"
              ? tPost("photoEditor.authRequired")
              : tPost("photoEditor.forbidden")}
          </h1>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Înapoi la Centru de Comandă
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 font-black uppercase text-[10px] tracking-widest hover:text-[#FFD100] transition-colors">
          <ArrowLeft size={14} /> Înapoi la Centru de Comandă
        </button>

        <div className="bg-white p-8 rounded-2xl border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">Editează <span className="text-[#FFD100]">Activul</span></h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Categoria: {category}</p>
            </div>
            <div className="bg-gray-100 text-gray-500 font-black text-[8px] uppercase tracking-widest px-3 py-1.5 rounded border border-gray-300">ID: {id.split('-')[0]}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Titlu Anunț</label>
              <input type="text" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase focus:outline-none focus:border-[#FFD100]" />
            </div>

            <ListingPhotoEditor
              images={listingImages}
              onChange={setListingImages}
              userId={currentUserId ?? ""}
              listingTitle={adTitle}
              disabled={isSaving}
              onBusyChange={setPhotosBusy}
              labels={{
                title: tPost("photoEditor.title"),
                hint: tPost("photoEditor.hint"),
                add: tPost("photoEditor.add"),
                main: tPost("cover.currentCover"),
                setMain: tPost("cover.setAsCover"),
                remove: tPost("photoEditor.remove"),
                moveLeft: tPost("photoEditor.moveLeft"),
                moveRight: tPost("photoEditor.moveRight"),
                preview: tPost("photoEditor.preview"),
                empty: tPost("cover.empty"),
                uploading: tPost("photoEditor.uploading"),
                remaining: tPost("photoEditor.remaining"),
                previewFailed: tPost("photoEditor.previewFailed"),
                keepLast: tPost("photoEditor.errors.keepLast"),
                alt: tPost("photoEditor.alt"),
                errors: {
                  unsupported_type: tPost("photoEditor.errors.unsupportedType"),
                  file_too_large: tPost("photoEditor.errors.fileTooLarge"),
                  limit_reached: tPost("photoEditor.errors.limitReached"),
                  upload_failed: tPost("photoEditor.errors.uploadFailed"),
                },
              }}
            />
            {saveError ? (
              <p className="md:col-span-2 text-sm font-semibold text-red-700" role="alert">
                {saveError}
              </p>
            ) : null}
            {saveMessage ? (
              <p className="md:col-span-2 text-sm font-semibold text-green-800" role="status">
                {saveMessage}
              </p>
            ) : null}

            {/* AUTO & MOTO */}
            {category === "Auto & Moto" && (
              <>
                <div>
                  <CarBrandCombobox
                    label={tPost("carBrand.label")}
                    placeholder={tPost("carBrand.placeholder")}
                    noMatches={tPost("carBrand.noMatches")}
                    listLabel={tPost("carBrand.listLabel")}
                    value={detailStr("make")}
                    onChange={(next) => updateField("make", next)}
                    inputClassName="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Model</label>
                  <input type="text" value={detailStr("model")} onChange={(e) => updateField('model', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Kilometraj (KM)</label>
                  <input type="number" value={detailStr("km")} onChange={(e) => updateField('km', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">An Fabricație</label>
                  <input type="number" value={detailStr("year")} onChange={(e) => updateField('year', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-gray-400">Motorizare / CP</label>
                   <input type="text" value={detailStr("engine")} onChange={(e) => updateField('engine', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-gray-400">Status</label>
                   <select value={detailStr("status")} onChange={(e) => updateField('status', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase">
                     <option>Înmatriculat RO</option>
                     <option>Neînmatriculat</option>
                   </select>
                </div>
              </>
            )}

            {/* IMOBILIARE */}
            {category === "Imobiliare" && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Suprafață (mp)</label>
                  <input type="number" value={detailStr("surface")} onChange={(e) => updateField('surface', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Camere</label>
                  <input type="number" value={detailStr("rooms")} onChange={(e) => updateField('rooms', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Etaj / Regim</label>
                  <input type="text" value={detailStr("floor")} onChange={(e) => updateField('floor', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">An Construcție</label>
                  <input type="number" value={detailStr("buildYear")} onChange={(e) => updateField('buildYear', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Localizare Exactă</label>
                  <input type="text" value={detailStr("location")} onChange={(e) => updateField('location', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase focus:border-[#FFD100] outline-none" />
                </div>
              </>
            )}

             {/* LUX & CEASURI */}
             {category === "Lux & Ceasuri" && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Brand</label>
                  <input type="text" value={detailStr("brand")} onChange={(e) => updateField('brand', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Model & Ref.</label>
                  <input type="text" value={detailStr("refModel")} onChange={(e) => updateField('refModel', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">An Achiziție</label>
                  <input type="number" value={detailStr("purchaseYear")} onChange={(e) => updateField('purchaseYear', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                 <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Pachet</label>
                  <select value={detailStr("boxPapers")} onChange={(e) => updateField('boxPapers', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase">
                     <option>Full Set (Cutie + Acte)</option><option>Doar Ceasul</option><option>Ceas + Cutie</option>
                  </select>
                </div>
              </>
            )}

            <div className="md:col-span-2 mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400">
                  {tPost("pricingMode.question")}
                </label>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {(
                      initialPricingMode === "price_on_request"
                        ? (["evaluated", "fixed_price", "price_on_request"] as const)
                        : (["evaluated", "fixed_price"] as const)
                    ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPricingMode(mode)}
                      className={`rounded-xl border-[3px] p-3 text-left transition ${
                        pricingMode === mode
                          ? "border-black bg-[#FFD100]"
                          : "border-black bg-white hover:bg-[#FFF9E8]"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-wide">
                        {tPost(`pricingMode.options.${mode}.title`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {pricingMode !== initialPricingMode ? (
                <p className="rounded-xl border-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {tPost("pricingMode.changeWarning")}
                </p>
              ) : null}
              {pricingMode !== "price_on_request" ? (
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">
                    {pricingMode === "fixed_price"
                      ? tPost("pricingMode.fixedPriceInputLabel")
                      : "Noul Preț de Exit (EUR)"}
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg">€</span>
                    <input
                      type="number"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="w-full p-4 pl-10 border-[3px] border-black rounded-xl font-black text-2xl italic focus:outline-none focus:border-[#FFD100]"
                    />
                  </div>
                  <p className="text-[8px] font-bold uppercase text-gray-500 mt-1">
                    Modificarea prețului poate atrage noi alerți către investitori.
                  </p>
                </div>
              ) : (
                <p className="text-xs font-semibold text-neutral-600">
                  {tPost("pricingMode.priceOnRequestNote")}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Descriere & Condiții</label>
              <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 p-4 border-2 border-black rounded-xl font-bold italic resize-none focus:border-[#FFD100] outline-none" />
            </div>

            {isOwner ? (
              <div className="md:col-span-2 rounded-xl border-[3px] border-black bg-[#FFFEF7] p-5">
                <h2 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
                  {tPremium("title")}
                </h2>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.premium_seller_enabled === true}
                      onChange={(e) =>
                        updateBooleanField("premium_seller_enabled", e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                    />
                    <span className="text-sm font-semibold leading-snug text-neutral-800">
                      {tPremium("enableProfile")}
                    </span>
                  </label>
                  {category === LISTING_AUTO_CATEGORY ? (
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.vehicle_reviewed === true}
                        onChange={(e) =>
                          updateBooleanField("vehicle_reviewed", e.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                      />
                      <span className="text-sm font-semibold leading-snug text-neutral-800">
                        {tPremium("vehicleReviewed")}
                      </span>
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isOwner && category === LISTING_AUTO_CATEGORY ? (
              <div className="md:col-span-2 rounded-xl border-[3px] border-black bg-[#F7F4EC] p-5">
                <h2 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
                  {tFinancing("editTitle")}
                </h2>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.financing_enabled === true}
                    onChange={(e) =>
                      updateBooleanField("financing_enabled", e.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                  />
                  <span className="text-sm font-semibold leading-snug text-neutral-800">
                    {tFinancing("enableCalculator")}
                  </span>
                </label>
              </div>
            ) : null}

            <button 
              type="button"
              onClick={handleUpdate}
              disabled={isSaving || photosBusy}
              className="md:col-span-2 w-full bg-black text-[#FFD100] py-5 rounded-xl font-black uppercase tracking-widest text-xs italic shadow-[5px_5px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Se criptează datele..." : "Salvează Noua Versiune"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditAdPage;