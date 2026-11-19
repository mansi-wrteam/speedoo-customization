import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "react-responsive";
import { FaShoppingBasket } from "react-icons/fa";
import * as api from "@/api/apiRoutes";
import { useSelector, useDispatch } from "react-redux";
import { t } from "@/utils/translation";
import { buyableFirst } from "@/utils/cartRowUtils";
import { formatPriceDisplay } from "@/lib/utils";
import { RiCloseFill } from "react-icons/ri";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  addGuestCartTotal,
  addtoGuestCart,
  setCart,
  setCartProducts,
  setCartSubTotal,
  subGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { toast } from "react-toastify";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import SingleSellerConfirmationModal from "../single-seller-confirmation-modal/SingleSellerConfirmationModal";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  getVariantLabel,
  getVariantImage,
  normalizeImage,
} from "@/utils/variantUtils";
import VariantAttributeChips from "../variant-attribute-chips/VariantAttributeChips";
import ProductCartControl from "../productcards/ProductCartControl";
import type React from "react";
import type { AppDispatch } from "@/redux/hooks";
import type { Id } from "@/types/common";
import type { Product, ProductVariant } from "@/types/models";
import type { RootState } from "@/types/state";

/** Per-product quantity summed across cart lines (getProductQuantities). */
type ProductQty = { product_id: number; qty: number };
type RowEvent = React.MouseEvent<HTMLElement>;

export interface VariantsModalProps {
  product: Product;
  showVariants: boolean;
  setShowVariants: React.Dispatch<React.SetStateAction<boolean>>;
}

const VariantsModal = ({ product, showVariants, setShowVariants }: VariantsModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const setting = useSelector((state: RootState) => state.Setting);
  const cart = useSelector((state: RootState) => state.Cart);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  // Starts as [] until the first add-to-cart attempt stores the variant.
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | never[]>([]);
  const [showSingleSellerModal, setSingleSellerModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Which variant's gallery to show — null = all product + variant images
  const [activeVariantId, setActiveVariantId] = useState<Id | null>(null);
  // Bottom sheet on phones, centred dialog from tablet up (Tailwind `md`).
  const isMobile = useMediaQuery({ query: "(max-width: 767px)" });

  // A variant's own photos only — attribute value images are option
  // illustrations for the chips, not product photos.
  const variantImages = (variant: ProductVariant | undefined) =>
    (variant?.images || []).map(normalizeImage).filter(Boolean);

  // Gallery: a variant is selected → only that variant's images; else product
  // cover + product images + every variant's images
  const galleryImages = useMemo(() => {
    if (activeVariantId) {
      const variant = product?.variants?.find((v) => v?.id === activeVariantId);
      const own = variantImages(variant);
      // No photos of its own: show the product's images instead of nothing.
      if (own.length) return [...new Set(own)];
    }
    const images = [
      product?.image_url,
      ...(product?.images || []),
      ...(product?.variants?.flatMap((variant) => variantImages(variant)) || []),
    ]
      .map(normalizeImage)
      .filter(Boolean);
    return [...new Set(images)];
  }, [product, activeVariantId]);

  // On open: preselect the first variant so the gallery starts with its images
  useEffect(() => {
    if (showVariants) {
      setPreviewImage(null);
      setActiveVariantId(product?.variants?.[0]?.id ?? null);
    }
  }, [showVariants, product]);

  // Thumbnail strip scrolls sideways; arrows show only when there is more to see.
  const thumbStrip = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateThumbArrows = () => {
    const strip = thumbStrip.current;
    if (!strip) return;
    // scrollLeft is negative in RTL; compare magnitudes.
    const scrolled = Math.abs(strip.scrollLeft);
    const max = strip.scrollWidth - strip.clientWidth;
    setCanScrollBack(scrolled > 2);
    setCanScrollForward(scrolled < max - 2);
  };

  useEffect(() => {
    if (!showVariants) return;
    // Wait a frame so the dialog has laid out before measuring.
    const frame = requestAnimationFrame(updateThumbArrows);
    const strip = thumbStrip.current;
    const observer = strip ? new ResizeObserver(updateThumbArrows) : null;
    if (strip) observer?.observe(strip);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [showVariants, galleryImages]);

  const scrollThumbs = (direction: 1 | -1) => {
    const strip = thumbStrip.current;
    if (!strip) return;
    const rtl = getComputedStyle(strip).direction === "rtl";
    strip.scrollBy({ left: direction * (rtl ? -1 : 1) * strip.clientWidth * 0.8, behavior: "smooth" });
  };

  // Preview: explicit thumbnail click wins, else first image of the current
  // gallery (variant-filtered when a variant is selected), else product cover
  const displayedImage =
    previewImage || galleryImages[0] || normalizeImage(product?.image_url);

  const handleHideVariantModal = () => {
    setShowVariants(false);
  };
  const isAlreadyAdded = (variant: ProductVariant) => {
    return (
      (cart?.isGuest === false &&
        (cart?.cartProducts?.find(
          (prdct) => prdct?.product_variant_id == variant?.id
        )?.qty as number) > 0) ||
      (cart?.isGuest === true &&
        (cart?.guestCart?.find(
          (prdct) => prdct?.product_variant_id === variant?.id
        )?.qty as number) > 0)
    );
  };
  const addedQuantity = (variant: ProductVariant) => {
    return cart.isGuest === false
      ? cart?.cartProducts?.find(
        (prdct) => prdct?.product_variant_id == variant?.id
      )?.qty
      : cart?.guestCart?.find(
        (prdct) => prdct?.product_variant_id == variant?.id
      )?.qty;
  };

  const isVariantAvailable = (variant: ProductVariant) => {
    return variant?.is_unlimited_stock == 0 && (variant?.stock as number) <= 0;
  };

  const getProductQuantities = (products: { product_id: Id; qty: number }[] | undefined): ProductQty[] => {
    return Object.entries(
      products!?.reduce<Record<string, number>>((quantities, product) => {
        const existingQty = quantities[product.product_id] || 0;
        return {
          ...quantities,
          [product.product_id]: existingQty + product.qty,
        };
      }, {})
    ).map(([productId, qty]) => ({
      product_id: parseInt(productId),
      qty,
    }));
  };

  // cart functionality
  const addToCart = async (productId: Id, variant: ProductVariant, qty: number) => {
    setSelectedVariant(variant);
    try {
      const response = await api.addToCart({
        product_id: productId,
        product_variant_id: variant.id,
        qty: qty,
      });
      if (response.status === 1) {
        if (
          cart?.cartProducts?.find(
            (product) =>
              product?.product_id == productId &&
              product?.product_variant_id == variant.id
          )?.qty == undefined
        ) {
          dispatch(setCart({ data: response }));
          const updatedCartCount = [
            ...cart?.cartProducts,
            { product_id: productId, product_variant_id: variant.id, qty: qty },
          ];
          dispatch(setCartProducts({ data: updatedCartCount }));
          dispatch(setCartSubTotal({ data: response?.sub_total }));
        } else {
          const updatedProducts = cart?.cartProducts?.map((product) => {
            if (
              product.product_id == productId &&
              product?.product_variant_id == variant.id
            ) {
              return { ...product, qty: qty };
            } else {
              return product;
            }
          });
          dispatch(setCart({ data: response }));
          dispatch(setCartProducts({ data: updatedProducts }));
          dispatch(setCartSubTotal({ data: response?.sub_total }));
        }
      } else if (response?.data?.one_seller_error_code == 1) {
        setSingleSellerModal(true);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const removeFromCart = async (productId: Id, variant: ProductVariant) => {
    try {
      const response = await api.removeFromCart({
        product_id: productId,
        product_variant_id: variant?.id,
      });
      if (response?.status === 1) {
        const updatedProducts = cart?.cartProducts?.filter(
          (product) => product?.product_variant_id != variant?.id
        );
        dispatch(setCartSubTotal({ data: response?.sub_total }));
        dispatch(setCartProducts({ data: updatedProducts }));
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log("error", error);
    }
  };
  const AddToGuestCart = (
    product: Product,
    productId: Id,
    variant: ProductVariant,
    Qty: number,
    isExisting: number,
    flag: "add" | "remove"
  ) => {
    // Numeric at runtime: a string price concatenates in addGuestCartTotal (bug #30).
    const finalPrice =
      variant?.discounted_price !== 0
        ? variant?.discounted_price as number
        : variant?.price as number;
    if (isExisting) {
      let updatedProducts;
      if (Qty !== 0) {
        if (flag == "add") {
          dispatch(addGuestCartTotal({ data: finalPrice }));
        } else if (flag == "remove") {
          dispatch(subGuestCartTotal({ data: finalPrice }));
        }
        updatedProducts = cart?.guestCart?.map((product) => {
          if (
            product?.product_id == productId &&
            product?.product_variant_id == variant.id
          ) {
            return { ...product, qty: Qty };
          } else {
            // dispatch(addGuestCartTotal({ data: finalPrice }));
            return product;
          }
        });
      } else {
        if (flag == "add") {
          dispatch(addGuestCartTotal({ data: finalPrice }));
        } else if (flag == "remove") {
          dispatch(subGuestCartTotal({ data: finalPrice }));
        }
        updatedProducts = cart?.guestCart?.filter(
          (product) => product?.product_variant_id != variant.id
        );
      }
      dispatch(addtoGuestCart({ data: updatedProducts }));
    } else {
      if (flag == "add") {
        dispatch(addGuestCartTotal({ data: finalPrice }));
      } else if (flag == "remove") {
        dispatch(subGuestCartTotal({ data: finalPrice }));
      }
      // dispatch(setGuestCartTotal({ data: finalPrice }))
      const productData = {
        product_id: productId,
        product_variant_id: variant.id,
        qty: Qty,
        productPrice: finalPrice,
        module_id: activeModuleId,
      };
      dispatch(addtoGuestCart({ data: [...cart?.guestCart, productData] }));
    }
  };
  const handleValidateAddExistingGuestProduct = (
    productQuantity: ProductQty[],
    product: Product,
    quantity: number,
    variant: ProductVariant
  ) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;
    if (Number(product.is_unlimited_stock !== 0)) {
      if (productQty >= Number(product?.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        AddToGuestCart(product, product?.id, variant, quantity, 1, "add");
      }
    } else {
      if (productQty >= Number(variant?.stock)) {
        toast.error(t("out_of_stock_message"));
      } else if (productQty >= Number(product?.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        AddToGuestCart(product, product?.id, variant, quantity, 1, "add");
      }
    }
  };
  const handleAddNewProductGuest = (productQuantity: ProductQty[], product: Product, variant: ProductVariant) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty;
    if ((productQty || 0) >= Number(product?.total_allowed_quantity)) {
      toast.error(t("max_cart_limit_error"));
    } else if (variant?.is_unlimited_stock == 0 && variant?.stock == 0) {
      toast.error(t("out_of_stock_message"));
    } else if (Number(product.is_unlimited_stock)) {
      AddToGuestCart(product, product.id, variant, 1, 0, "add");
    } else {
      if (variant?.status) {
        AddToGuestCart(product, product.id, variant, 1, 0, "add");
      } else {
        toast.error(t("out_of_stock_message"));
      }
    }
  };
  const handleValidateAddNewProduct = (productQuantity: ProductQty[], product: Product, variant: ProductVariant) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty;
    if ((productQty || 0) >= Number(product?.total_allowed_quantity)) {
      toast.error(t("max_cart_limit_error"));
    } else if (variant?.is_unlimited_stock == 0 && variant?.stock == 0) {
      toast.error(t("out_of_stock_message"));
    } else if (Number(product.is_unlimited_stock)) {
      addToCart(product.id, variant, 1);
    } else {
      if (variant?.status) {
        addToCart(product.id, variant, 1);
      } else {
        toast.error(t("out_of_stock_message"));
      }
    }
  };
  const handleIntialAddToCart = (e: RowEvent, variant: ProductVariant) => {
    e.preventDefault();
    const quantity = getProductQuantities(cart?.cartProducts);
    if (cart?.isGuest) {
      handleAddNewProductGuest(quantity, product, variant);
    } else {
      handleValidateAddNewProduct(quantity, product, variant);
    }
  };
  const handleValidateAddExistingProduct = (
    productQuantity: ProductQty[],
    product: Product,
    variant: ProductVariant
  ) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;
    if (Number(product.is_unlimited_stock)) {
      if (productQty < Number(product?.total_allowed_quantity)) {
        addToCart(
          product.id,
          variant,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == variant?.id
          )?.qty as number) + 1
        );
      } else {
        toast.error(t("max_cart_limit_error"));
      }
    } else {
      if (productQty >= Number(variant.stock)) {
        toast.error(t("out_of_stock_message"));
      } else if (Number(productQty) >= Number(product.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        addToCart(
          product.id,
          variant,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == variant?.id
          )?.qty as number) + 1
        );
      }
    }
  };
  const handleQuantityIncrease = (e: RowEvent, variant: ProductVariant) => {
    e.preventDefault();
    e.stopPropagation();
    if (cart?.isGuest) {
      const productQuantity = getProductQuantities(cart?.guestCart);
      handleValidateAddExistingGuestProduct(
        productQuantity,
        product,
        (cart?.guestCart?.find(
          (prdct) =>
            prdct?.product_id == product?.id &&
            prdct?.product_variant_id == variant?.id
        )?.qty as number) + 1,
        variant
      );
    } else {
      const quantity = getProductQuantities(cart?.cartProducts);
      handleValidateAddExistingProduct(quantity, product, variant);
    }
  };
  const handleQuantityDecrease = (e: RowEvent, variant: ProductVariant) => {
    e.preventDefault();
    e.stopPropagation();
    if (cart?.isGuest) {
      AddToGuestCart(
        product,
        product?.id,
        variant,
        (cart?.guestCart?.find(
          (prdct) => prdct?.product_variant_id == variant?.id
        )?.qty as number) - 1,
        1,
        "remove"
      );
    } else {
      if (
        cart?.cartProducts?.find(
          (prdct) => prdct?.product_variant_id == variant?.id
        )!.qty == 1
      ) {
        removeFromCart(product?.id, variant);
      } else {
        addToCart(
          product.id,
          variant,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == variant?.id
          )?.qty as number) - 1
        );
      }
    }
  };

  // Display only: discount badge on a row; same price fields the row already shows.
  const discountPercent = (variant: ProductVariant) => {
    const price = Number(variant?.price);
    const discounted = Number(variant?.discounted_price);
    if (!discounted || !price || discounted >= price) return 0;
    return Math.round(((price - discounted) / price) * 100);
  };

  // Swipe down on the sheet (handle or header, not the scrolling list) to close.
  const sheetDragStart = useRef<{ x: number; y: number } | null>(null);
  const [sheetDragY, setSheetDragY] = useState(0);
  const SHEET_CLOSE_DISTANCE = 100;

  const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-variant-list]")) return;
    sheetDragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = sheetDragStart.current;
    if (start == null) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    // A sideways swipe (the thumbnail strip) is not a close gesture.
    if (sheetDragY === 0 && Math.abs(dx) > Math.abs(dy)) {
      sheetDragStart.current = null;
      return;
    }
    setSheetDragY(Math.max(0, dy));
  };

  const handleSheetTouchEnd = () => {
    if (sheetDragStart.current == null) return;
    sheetDragStart.current = null;
    if (sheetDragY > SHEET_CLOSE_DISTANCE) handleHideVariantModal();
    setSheetDragY(0);
  };

  // Header + variant list, shared by the desktop dialog and the mobile sheet.
  const content = (
    <>
      <DialogHeader className="relative shrink-0 space-y-0 overflow-hidden p-0 text-start">
        {/* Soft brand wash behind the header — follows the module theme. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -end-16 h-48 w-48 rounded-full bg-[var(--brand-background-default)] opacity-15 blur-3xl"
        />
        <div className="relative flex items-start gap-4 p-4 md:p-5">
          {/* Main preview — swaps on variant select / thumbnail click */}
          {/* Fill mode: the image sizes to the tile, object-contain keeps it whole. */}
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm md:h-32 md:w-32">
            <ImageWithPlaceholder
              key={displayedImage}
              src={displayedImage}
              alt={product?.translations?.name || product?.name || "product image"}
              sizes="128px"
              className="object-contain transition-opacity duration-200"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--brand-foreground-default)]">
              {t("chooseVariant")}
            </span>
            <h3 className="line-clamp-2 text-lg font-extrabold leading-6 text-[var(--foreground-primary)]">
              {product?.translations?.name}
            </h3>
            {/* Thumbnail strip — all product + variant images */}
            {galleryImages.length > 1 ? (
              <div className="relative mt-0.5 min-w-0">
              <div
                ref={thumbStrip}
                onScroll={updateThumbArrows}
                className="-mx-1 flex snap-x scroll-px-1 gap-2 overflow-x-auto scroll-smooth px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {galleryImages.map((image) => (
                  <button
                    key={image}
                    type="button"
                    className={`relative h-12 w-12 shrink-0 snap-start overflow-hidden rounded-xl bg-[var(--surface-default)] transition-all ${
                      displayedImage === image
                        ? "border-2 border-[var(--brand-border-default)]"
                        : "border border-[var(--border-subtle)] opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => setPreviewImage(image)}
                  >
                    <ImageWithPlaceholder
                      src={image}
                      alt={product?.translations?.name || product?.name || "product image"}
                      sizes="48px"
                      className="object-contain"
                    />
                  </button>
                ))}
              </div>
              {/* Fade + arrow at each edge that has hidden thumbnails. */}
              {canScrollBack ? (
                <div className="pointer-events-none absolute inset-y-0 start-0 hidden items-center md:flex bg-gradient-to-r from-[var(--surface-default)] via-[var(--surface-default)]/80 to-transparent pe-6 rtl:bg-gradient-to-l">
                  <button
                    type="button"
                    onClick={() => scrollThumbs(-1)}
                    aria-label="previous images"
                    className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--foreground-primary)] shadow-md transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <FiChevronLeft size={16} className="rtl:-scale-x-100" />
                  </button>
                </div>
              ) : null}
              {canScrollForward ? (
                <div className="pointer-events-none absolute inset-y-0 end-0 hidden items-center md:flex bg-gradient-to-l from-[var(--surface-default)] via-[var(--surface-default)]/80 to-transparent ps-6 rtl:bg-gradient-to-r">
                  <button
                    type="button"
                    onClick={() => scrollThumbs(1)}
                    aria-label="next images"
                    className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--foreground-primary)] shadow-md transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <FiChevronRight size={16} className="rtl:-scale-x-100" />
                  </button>
                </div>
              ) : null}
              </div>
            ) : null}
          </div>
          {/* Dialog only: the bottom sheet closes by swipe-down or tapping outside. */}
          {!isMobile ? (
            <button
              type="button"
              onClick={handleHideVariantModal}
              aria-label={t("close")}
              className="shrink-0 rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <RiCloseFill size={20} />
            </button>
          ) : null}
        </div>
      </DialogHeader>

      {/* The only scrolling region in the dialog */}
      <div data-variant-list className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3">
        <div className="flex flex-col gap-2">
          {/* Buyable first, API order kept inside each group (§5.2). */}
          {buyableFirst(product?.variants, product?.is_unlimited_stock).map((variant) => {
            const isAdded = isAlreadyAdded(variant);
            const quantity = addedQuantity(variant);
            const isVariantInStock = isVariantAvailable(variant);
            const isActive = activeVariantId === variant?.id;
            const rowImage =
              getVariantImage(variant, product?.image_url) || normalizeImage(product?.image_url);
            const off = discountPercent(variant);

            return (
              <div
                className={`group relative flex items-center gap-3 rounded-xl border bg-[var(--surface-default)] px-3 py-2 transition-all ${
                  isVariantInStock ? "cursor-default opacity-60" : "cursor-pointer"
                } ${
                  isActive
                    ? "border-[var(--brand-border-default)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:shadow-sm"
                }`}
                key={variant?.id}
                onClick={() => {
                  // Select this variant → gallery shows only its images
                  setActiveVariantId(variant?.id);
                  setPreviewImage(null);
                }}
              >
                {rowImage ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-default)]">
                    <ImageWithPlaceholder
                      src={rowImage}
                      alt={getVariantLabel(variant)}
                      sizes="48px"
                      className="object-contain"
                    />
                  </div>
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* Chips wrap within their own column. */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <VariantAttributeChips variant={variant} size="sm" />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[15px] font-extrabold text-[var(--foreground-primary)]">
                      {setting?.setting?.currency}
                      {formatPriceDisplay(
                        variant?.discounted_price == 0
                          ? variant?.price
                          : variant?.discounted_price
                      )}
                    </span>
                    {variant?.discounted_price != 0 &&
                      variant?.discounted_price != variant?.price && (
                        <span className="text-xs text-[var(--foreground-tertiary)] line-through">
                          {setting?.setting?.currency}
                          {formatPriceDisplay(variant?.price)}
                        </span>
                      )}
                    {off > 0 ? (
                      <span className="rounded-full bg-[var(--status-success-background)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--status-success-foreground)]">
                        {off}% {t("off")}
                      </span>
                    ) : null}
                  </div>
                  {variant?.few_quantity_left && !isVariantInStock ? (
                    <span className="text-xs font-semibold text-[var(--status-warning-foreground)]">
                      {t("few_quantity_left")}
                    </span>
                  ) : null}
                </div>

                <div className="shrink-0">
                  {!isVariantInStock ? (
                    // Same control as the product cards; handlers unchanged.
                    <ProductCartControl
                      isAdded={isAdded}
                      quantity={quantity}
                      onIncrease={(e) => handleQuantityIncrease(e, variant)}
                      onDecrease={(e) => handleQuantityDecrease(e, variant)}
                      onAdd={(e) => handleIntialAddToCart(e, variant)}
                    />
                  ) : (
                    <span className="rounded-full bg-[var(--status-error-background)] px-2.5 py-1 text-[11px] font-bold text-[var(--status-error-foreground)]">
                      {t("out_of_stock")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        // Phones: slides up from the bottom; the list is the only scroller.
        <Sheet
          open={showVariants}
          // Tap outside (or Esc) closes it.
          onOpenChange={(open) => {
            if (!open) handleHideVariantModal();
          }}
        >
          <SheetContent
            side="bottom"
            className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-t-3xl border-0 bg-[var(--surface-default)] p-0"
            style={
              sheetDragY
                ? { transform: `translateY(${sheetDragY}px)`, transition: "none" }
                : undefined
            }
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            onTouchCancel={handleSheetTouchEnd}
          >
            <SheetTitle className="sr-only">{t("chooseVariant")}</SheetTitle>
            <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-[var(--border-default)]" />
            {content}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showVariants}>
          {/* Capped height with the variant list as the only scroller — a product
              with 20 variants must not push the header or the preview off screen. */}
          <DialogContent className="flex max-h-[88vh] w-full max-w-xl flex-col gap-0 overflow-hidden rounded-3xl border-[var(--border-subtle)] p-0 md:p-0 shadow-2xl">
            {content}
          </DialogContent>
        </Dialog>
      )}
      <SingleSellerConfirmationModal
        showSingleSellerModal={showSingleSellerModal}
        setSingleSellerModal={setSingleSellerModal}
        product={product}
        selectedVariant={selectedVariant as ProductVariant}
      />
    </>
  );
};

export default VariantsModal;
