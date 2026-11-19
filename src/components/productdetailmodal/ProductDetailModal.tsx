import { useEffect, useState } from "react";
import { cn, formatAmount } from "@/lib/utils";
import * as api from "@/api/apiRoutes";
import { Dialog, DialogContent, closeButtonClass } from "@/components/ui/dialog";
import {FaShoppingBasket, FaStar, FaLink } from "react-icons/fa";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { t } from "@/utils/translation";
import { FiMinus, FiPlus } from "react-icons/fi";
import VegIcon from "@/assets/VegIcon.svg";
import NonVegIcon from "@/assets/NonVegIcon.svg";
import NonCancelable from "@/assets/NotCancelable.svg";
import Cancelable from "@/assets/Cancelable.svg";
import Returnable from "@/assets/Returnable.svg";
import NotReturnable from "@/assets/NotReturnable.svg";
import {
  WhatsappShareButton,
  WhatsappIcon,
  TwitterIcon,
  TwitterShareButton,
  FacebookIcon,
  FacebookShareButton,
} from "react-share";
import { RiCloseFill } from "react-icons/ri";
import {
  addtoGuestCart,
  setCart,
  setCartProducts,
  setCartSubTotal,
  setGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { toast } from "react-toastify";
import { BiHeart, BiSolidHeart } from "react-icons/bi";
import { setFavoriteProductIds } from "@/redux/slices/FavoriteSlice";
import Loader from "../loader/Loader";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import SingleSellerConfirmationModal from "../single-seller-confirmation-modal/SingleSellerConfirmationModal";
import { pressable } from "@/utils/a11y";
import { useFoodCustomizeFlow } from "@/utils/useFoodCustomizeFlow";
import AddonCustomizationModal from "../addon-customization-modal/AddonCustomizationModal";
import RepeatCustomizationModal from "../addon-customization-modal/RepeatCustomizationModal";
import {
  buildAttributes,
  getVariantSelection,
  findVariant,
  getVariantLabel,
  getVariantImage,
  hasAttributeVariants,
  normalizeImage,
} from "@/utils/variantUtils";
import type React from "react";
import type { AppDispatch } from "@/redux/hooks";
import type { Id, Numeric } from "@/types/common";
import type {
  GuestCartLine,
  Product,
  ProductRatingSummary,
  ProductVariant,
  VariantSelection,
} from "@/types/models";
import type { RootState } from "@/types/state";

/** Per-product quantity summed across cart lines (getProductQuantities). */
type ProductQty = { product_id: number; qty: number };

export interface ProductDetailModalProps {
  /** Listing product; the full product is fetched by `id`/`slug` on open. */
  product: Product;
  showDetailModal: boolean;
  setShowDetailModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProductDetailModal = ({
  product,
  showDetailModal,
  setShowDetailModal,
}: ProductDetailModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const setting = useSelector((state: RootState) => state.Setting);
  const city = useSelector((state: RootState) => state.City.city);
  const cart = useSelector((state: RootState) => state.Cart);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const user = useSelector((state: RootState) => state.User);
  const favoriteProducts = useSelector(
    (state: RootState) => state.Favorite.favouriteProductIds
  );

  const ratingsCount = 10;
  const currency = setting?.setting?.currency;
  // Every price here follows the store's decimal_point setting.
  const decimals = setting?.setting?.decimal_point;
  // Starts as [] until getProductById resolves (field reads on [] give undefined).
  const [productDetails, setProductDetails] = useState<Product>([] as unknown as Product);
  // The listing product has no seller relation; the fetched one does.
  const sellerName =
    productDetails?.seller?.translations?.name ?? product?.seller?.translations?.name;
  const [selectVariant, setSelectedVariant] = useState(product?.variants?.[0]);
  const [selectedAttrs, setSelectedAttrs] = useState<VariantSelection>({});
  const [ratingData, setRatingData] = useState<ProductRatingSummary>({});
  const [quantity, setQuantity] = useState(1);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSingleSellerModal, setSingleSellerModal] = useState(false);
  const [isVariantAvailable, setIsVariantAvailable] = useState(false);

  // Food: Add hands off to the Customise sheet (variant + add-ons) or the
  // Repeat sheet, which replace this modal's own variant picker. Products with
  // nothing to customise fall through to the plain add below.
  const foodFlow = useFoodCustomizeFlow({
    product,
    onPlainAdd: () => handleAddToCart(),
    onPlainIncrease: () => handleAddToCart(),
  });
  // Modal on modal doesn't work, so the quick view steps aside while a sheet
  // is open and comes back when it closes.
  const sheetOpen = foodFlow.showAddonModal || foodFlow.showRepeatModal;

  const calculateDiscount = (discountPrice: number, actualPrice: number) => {
    const difference = actualPrice - discountPrice;
    const actualDiscountPrice = difference / actualPrice;
    return actualDiscountPrice * 100;
  };

  useEffect(() => {
    if (showDetailModal) {
      fetchProductById();
      fetchRatings();
    }
  }, [showDetailModal, product?.id, product?.slug]);

  useEffect(() => {
    handleIsVariantAvailable();
  }, [selectVariant]);

  const fetchProductById = async () => {
    setLoading(true);
    try {
      const res = await api.getProductById({
        latitude: city!.latitude,
        longitude: city!.longitude,
        id:product?.id,
        slug: product.slug,
      });
      setLoading(false);
      const firstVariant = res?.data?.variants?.[0];
      const images = [
        res?.data?.image_url,
        ...(res?.data?.images || []),
        ...(firstVariant?.images || []),
      ]
        .map(normalizeImage)
        .filter(Boolean) as string[];
      const gallery = [...new Set(images)];
      setProductImages(gallery);
      setSelectedImage(gallery[0] || "");
      setProductDetails(res.data);
      setSelectedVariant(firstVariant);
      setSelectedAttrs(getVariantSelection(firstVariant));
    } catch (error) {
      setLoading(true);
      console.log("error", error);
    }
  };

  const handleIsVariantAvailable = () => {
    if (product?.is_unlimited_stock == 0 && (selectVariant?.stock as number) <= 0) {
      setIsVariantAvailable(false);
    } else {
      setIsVariantAvailable(true);
    }
  };

  const attributes = buildAttributes(productDetails?.variants);
  const isMultiAttribute = hasAttributeVariants(productDetails?.variants);

  const applyVariant = (variant: ProductVariant | undefined) => {
    if (!variant) return;
    setQuantity(1);
    setSelectedVariant(variant);
    setSelectedAttrs(getVariantSelection(variant));
    const variantImage = getVariantImage(variant, productDetails?.image_url);
    if (variantImage) setSelectedImage(variantImage);
  };

  const handleChangeVariant = (variant: ProductVariant) => {
    applyVariant(variant);
  };

  // Bidirectional availability: a value is available if a variant contains it
  // together with the selected values of all OTHER attributes.
  const isValueAvailable = (attributeId: Id, valueId: Id) => {
    return productDetails?.variants?.some((variant) => {
      const ids = variant?.attribute_values?.map((av) => av.id) || [];
      if (!ids.includes(valueId)) return false;
      return attributes.every((attr) => {
        if (attr.id === attributeId) return true;
        const selected = selectedAttrs[attr.id];
        return !selected || ids.includes(selected);
      });
    });
  };

  const handleSelectAttribute = (attributeId: Id, valueId: Id) => {
    const nextAttrs = { ...selectedAttrs, [attributeId]: valueId };
    attributes.forEach((attr) => {
      if (attr.id === attributeId) return;
      const matches = (valId: Id) =>
        productDetails?.variants?.some((variant) => {
          const ids = variant?.attribute_values?.map((av) => av.id) || [];
          if (!ids.includes(valId)) return false;
          return attributes.every((other) => {
            if (other.id === attr.id) return true;
            const sel = nextAttrs[other.id];
            return !sel || ids.includes(sel);
          });
        });
      if (!matches(nextAttrs[attr.id])) {
        const firstAvailable = attr.values.find((val) => matches(val.id));
        if (firstAvailable) nextAttrs[attr.id] = firstAvailable.id;
      }
    });
    const variant = findVariant(productDetails?.variants, nextAttrs);
    if (variant) {
      applyVariant(variant);
    } else {
      setSelectedAttrs(nextAttrs);
    }
  };

  const fetchRatings = async () => {
    try {
      const result = await api.getProductRatings({
        id: product?.id,
        limit: ratingsCount,
        offset: 0,
      });
      setRatingData(result?.data);
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleHideDetailModal = () => {
    setShowDetailModal(false);
  };

  const handleDecreaseQuantity = () => {
    if (quantity <= 1) {
      return;
    } else {
      setQuantity(quantity - 1);
    }
  };
  const handleIncreseQuantity = () => {
    if (
      Number(product?.is_unlimited_stock) == 0 &&
      quantity >= (selectVariant?.stock as number)
    ) {
      toast.error(t("out_of_stock"));
    } else if (quantity >= (product?.total_allowed_quantity as number)) {
      toast.error(t("max_cart_limit_error"));
    } else {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = async () => {
    let productQuantity = cart?.isGuest
      ? getProductQuantities(cart?.guestCart)
      : getProductQuantities(cart?.cartProducts);
    const isExisting = cart.guestCart.find(
      (cartProduct) =>
        cartProduct?.product_id == product?.id &&
        cartProduct?.product_variant_id == selectVariant?.id
    );
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;
    const cartProductQty = cart.cartProducts.find(
      (prdct) =>
        prdct?.product_id == product?.id &&
        selectVariant?.id == prdct?.product_variant_id
    );
    const totalQty = productQty ? productQty + quantity : quantity;
    if (Number(product?.is_unlimited_stock) == 0 && (selectVariant?.stock as number) <= 0) {
      toast.error(t("out_of_stock_message"));
      return;
    }
    if (cart?.isGuest) {
      if (productQty + quantity > (product?.total_allowed_quantity as number)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        if (isExisting) {
          const updatedProduct = cart.guestCart?.map((cartProduct) => {
            if (
              cartProduct?.product_id == product?.id &&
              cartProduct?.product_variant_id == selectVariant?.id
            ) {
              return { ...cartProduct, qty: cartProduct.qty + quantity };
            } else {
              return cartProduct;
            }
          });
          dispatch(addtoGuestCart({ data: updatedProduct }));
          handleCalculateTotal(updatedProduct);
          setQuantity(1);
          toast.success(t("product_added_successfully"));
        } else {
          const productPrice =
            selectVariant.discounted_price !== 0
              ? selectVariant.discounted_price
              : selectVariant.price;
          const productData = {
            product_id:product?.id,
            product_variant_id: selectVariant?.id,
            qty: quantity,
            productPrice: productPrice as Numeric,
            module_id: activeModuleId,
          };
          dispatch(addtoGuestCart({ data: [...cart?.guestCart, productData] }));
          let products = [...cart.guestCart, productData];
          handleCalculateTotal(products);
          setQuantity(1);
          toast.success(t("product_added_successfully"));
        }
      }
    } else {
      try {
        const isInclude = productQuantity.some(
          (item) => item.product_id === product?.id
        );
        if (productQty + quantity > (product?.total_allowed_quantity as number)) {
          toast.error(t("max_cart_limit_error"));
        } else if (
          cart?.cartProducts?.length >= (setting?.setting?.max_cart_items_count as number)
        ) {
          toast.error(t("maximum_cart_quantity_reach"));
        } else if (
          !isInclude &&
          cart?.cartProducts?.length >= (setting?.setting?.max_cart_items_count as number)
        ) {
          toast.error(t("maximum_cart_quantity_reach"));
        } else {
          const response = await api.addToCart({
            product_id:product?.id,
            product_variant_id: selectVariant.id,
            qty: cartProductQty ? cartProductQty.qty + quantity : quantity,
          });
          if (response.status == 1) {
            if (cartProductQty) {
              const updatedProducts = cart.cartProducts.map((cartProduct) => {
                if (
                  cartProduct.product_id ==product?.id &&
                  cartProduct.product_variant_id == selectVariant.id
                ) {
                  return {
                    ...cartProduct,
                    qty: cartProductQty
                      ? cartProductQty.qty + quantity
                      : quantity,
                  };
                } else {
                  return cartProduct;
                }
              });
              dispatch(setCartProducts({ data: updatedProducts }));
            } else {
              const productData = [
                ...cart.cartProducts,
                {
                  product_id:product?.id,
                  product_variant_id: selectVariant?.id,
                  qty: quantity,
                },
              ];
              dispatch(setCartProducts({ data: productData }));
            }
            dispatch(setCart({ data: response }));
            dispatch(setCartSubTotal({ data: response.sub_total }));
            toast.success(t("product_added_successfully"));
          } else if (response?.data?.one_seller_error_code == 1) {
            setSingleSellerModal(true);
          } else {
            toast.error(response.message);
          }
        }
      } catch (error) {
        console.log("Error", error);
      }
    }
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
  const handleCalculateTotal = (products: GuestCartLine[]) => {
    const total = products.reduce((prev, curr) => {
      prev += (curr.productPrice as number) * curr.qty;
      return prev;
    }, 0);
    dispatch(setGuestCartTotal({ data: total }));
  };

  const handleProductLikes = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const isAlreadyLikes = favoriteProducts?.includes(product?.id);
    try {
      if (user?.jwtToken) {
        if (!isAlreadyLikes) {
          const response = await api.addToFavorite({ product_id: product?.id });
          if (response.status == 1) {
            const updatedFavProducts = [...favoriteProducts!, product?.id];
            dispatch(setFavoriteProductIds({ data: updatedFavProducts }));
            toast.success(response.message);
          } else {
            toast.error(response.message);
          }
        } else {
          const response = await api.removeFromFavorite({
            product_id: product?.id,
          });
          if (response.status == 1) {
            const updatedFavProducts = favoriteProducts?.filter(
              (prdctId) => prdctId != product?.id
            );
            dispatch(setFavoriteProductIds({ data: updatedFavProducts }));
            toast.success(response.message);
          } else {
            toast.error(response.message);
          }
        }
      } else {
        toast.error(t("required_login_message_for_wishlist"));
      }
    } catch (error) {
      console.log("Error", error);
    }
  };
  const handleChangeCoverImage = (image: string) => {
    setSelectedImage(image);
  };
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(
      `${process.env.NEXT_PUBLIC_BASE_URL}/product/${product?.slug}`
    );
    toast.success(t("link_copied_to_clipboard"));
  };

  const hasDiscount =
    selectVariant?.discounted_price !== 0 &&
    selectVariant?.discounted_price !== selectVariant?.price;
  const discountPercent = hasDiscount
    ? Math.round(calculateDiscount(selectVariant?.discounted_price as number, selectVariant?.price as number))
    : 0;
  const isFavorite = !!favoriteProducts?.includes(product?.id);
  const tillStatusLabel = (
    { 1: t("payment_pending"), 2: t("received"), 3: t("processed"), 4: t("shipped"), 5: t("out_for_delivery") } as Record<number, string>
  )[Number(productDetails?.till_status)];

  // API sends null / missing / "" for no licence; hide the whole FSSAI block then.
  const hasFssai = String(productDetails?.fssai_lic_no ?? "").trim() !== "";

  return (
    <>
      <Dialog open={showDetailModal && !sheetOpen}>
        <DialogContent className="w-[calc(100%-32px)] max-w-3xl gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl md:p-0">
          <button
            type="button"
            aria-label={t("close")}
            className={cn(closeButtonClass, "absolute right-3 top-3 z-20")}
            onClick={handleHideDetailModal}
          >
            <RiCloseFill />
          </button>
          {loading ? (
            <div className="grid min-h-[420px] place-items-center">
              <Loader />
            </div>
          ) : (
            <div className="grid max-h-[90vh] grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:overflow-hidden">
              {/* Media: main image on a soft surface, thumbnails underneath. */}
              <div className="flex flex-col gap-3 bg-[var(--surface-subtle)] p-4 md:p-5">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--surface-default)]">
                  <ImageWithPlaceholder
                    src={selectedImage}
                    alt={productDetails.name}
                    className="h-full w-full object-cover"
                    width={424}
                    height={424}
                    quality={75}
                  />
                  {hasDiscount ? (
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--status-error-default)] px-2.5 py-1 text-xs font-bold uppercase leading-4 text-[var(--status-error-on-status)]">
                      {discountPercent}% {t("off")}
                    </span>
                  ) : null}
                </div>
                {productImages?.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {productImages.map((image, index) => (
                      <button
                        type="button"
                        key={index}
                        aria-label={`${productDetails?.translations?.name ?? ""} ${index + 1}`}
                        aria-pressed={image === selectedImage}
                        onClick={() => handleChangeCoverImage(image)}
                        className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--surface-default)] transition-colors ${
                          image === selectedImage
                            ? "border-[var(--brand-border-default)]"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <ImageWithPlaceholder
                          src={image}
                          alt=""
                          height={112}
                          width={112}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Details */}
              <div className="flex min-w-0 flex-col gap-4 p-5 md:max-h-[90vh] md:overflow-y-auto md:p-6">
                <div className="flex flex-col gap-1.5 pr-10">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--foreground-secondary)]">
                    {productDetails?.indicator ? (
                      <span className="relative size-4 shrink-0">
                        <Image
                          src={productDetails?.indicator == 1 ? VegIcon : NonVegIcon}
                          fill
                          alt={productDetails?.indicator == 1 ? t("vegetarian") : t("non-vegetarian")}
                        />
                      </span>
                    ) : null}
                    {sellerName && (
                      <span className="truncate">
                        {t("by")} <span className="font-semibold text-[var(--foreground-primary)]">{sellerName}</span>
                      </span>
                    )}
                    {(ratingData?.average_rating as number) > 0 && product?.product_rating == true ? (
                      <span className="flex items-center gap-1">
                        <FaStar size={12} className="fill-[var(--status-warning-default)]" />
                        <span className="font-semibold text-[var(--foreground-primary)]">
                          {Number(ratingData?.average_rating).toFixed(1)}
                        </span>
                        ({ratingData?.rating_list?.length})
                      </span>
                    ) : null}
                  </div>
                  <h2 className="line-clamp-2 text-xl font-bold leading-7 text-[var(--foreground-primary)]">
                    {productDetails?.translations?.name}
                  </h2>
                  {selectVariant?.few_quantity_left == true && (
                    <p className="text-xs font-semibold text-[var(--status-error-default)]">{t("few_quantity_left")}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl font-bold text-[var(--foreground-primary)]">
                    {currency}
                    {formatAmount(hasDiscount ? selectVariant?.discounted_price : selectVariant?.price, decimals)}
                  </span>
                  {hasDiscount ? (
                    <>
                      <span className="text-base text-[var(--foreground-tertiary)] line-through">
                        {currency}
                        {formatAmount(selectVariant?.price, decimals)}
                      </span>
                      <span className="rounded-full bg-[var(--status-success-background)] px-2 py-0.5 text-xs font-semibold text-[var(--status-success-foreground)]">
                        {t("save")} {currency}
                        {formatAmount(Number(selectVariant?.price) - Number(selectVariant?.discounted_price), decimals)}
                      </span>
                    </>
                  ) : null}
                </div>

              {foodFlow.isFoodModule ? null : isMultiAttribute ? (
                <div className="flex flex-col gap-4">
                  {attributes?.map((attribute) => (
                    <div className="flex flex-col gap-2" key={attribute.id}>
                      <p className="font-medium text-sm text-[var(--foreground-primary)] capitalize">
                        {t("select")} {attribute?.name}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {attribute?.values?.map((attrValue) => {
                          const isSelected =
                            selectedAttrs?.[attribute.id] == attrValue.id;
                          const isAvailable = isValueAvailable(
                            attribute.id,
                            attrValue.id,
                          );
                          const stateClass = isSelected
                            ? "border-[var(--brand-border-default)] bg-[var(--brand-background-subtle)]"
                            : isAvailable
                              ? "border-[var(--border-default)]"
                              : "border-[var(--border-default)] opacity-40 cursor-not-allowed pointer-events-none";
                          const onSelect = () =>
                            isAvailable &&
                            handleSelectAttribute(attribute.id, attrValue.id);
                          if (attribute?.type == "color") {
                            return (
                              <div {...pressable}
                                key={attrValue.id}
                                title={attrValue?.value as string}
                                className={`inline-flex flex-col justify-center items-center gap-1.5 px-3 pt-3 pb-2 rounded-lg cursor-pointer border ${stateClass}`}
                                onClick={onSelect}
                              >
                                <span
                                  className="block h-6 w-6 rounded-full border border-[var(--border-default)]"
                                  style={{
                                    backgroundColor:
                                      attrValue?.color_code || "var(--surface-disabled)",
                                  }}
                                ></span>
                                <p className="text-sm font-normal capitalize line-clamp-1 text-[var(--foreground-primary)]">
                                  {attrValue?.value}
                                </p>
                              </div>
                            );
                          }
                          if (
                            attribute?.type == "image" &&
                            attrValue?.image_url
                          ) {
                            return (
                              <div {...pressable}
                                key={attrValue.id}
                                title={attrValue?.value as string}
                                className={`flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer border w-[100px] p-2 ${stateClass}`}
                                onClick={onSelect}
                              >
                                <div className="h-[72px] w-full relative">
                                  <ImageWithPlaceholder
                                    src={attrValue.image_url}
                                    alt={attrValue?.value}
                                    width={80}
                                    height={72}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <p className="text-sm font-medium capitalize line-clamp-1 text-[var(--foreground-primary)]">
                                  {attrValue?.value}
                                </p>
                              </div>
                            );
                          }
                          return (
                            <div {...pressable}
                              key={attrValue.id}
                              className={`inline-flex flex-col justify-center items-center min-w-9 min-h-9 px-3 py-2 rounded-lg cursor-pointer border ${stateClass}`}
                              onClick={onSelect}
                            >
                              <p className="text-sm font-normal text-[var(--foreground-primary)]">
                                {attrValue?.short_code
                                  ? `${attrValue.value} ${attrValue.short_code}`
                                  : attrValue?.value}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="font-medium text-sm text-[var(--foreground-primary)]">
                    {t("chooseVariant")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {productDetails?.variants?.map((variant) => {
                      const discountPrice = variant?.discounted_price;
                      const price = variant?.price;
                      const isSelected = selectVariant?.id == variant?.id;
                      return (
                        <div {...pressable}
                          className={`flex-1 min-w-[92px] max-w-[140px] rounded-lg border py-2 px-1 text-center flex flex-col justify-center items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "border-[var(--brand-border-default)] bg-[var(--background-default)] shadow-raised"
                              : "border-[var(--border-default)] bg-[var(--background-default)]"
                          }`}
                          key={variant.id}
                          onClick={() => handleChangeVariant(variant)}
                        >
                          <p className="font-bold text-base leading-5 line-clamp-2 text-[var(--foreground-primary)]">
                            {getVariantLabel(variant)}
                          </p>
                          <span className="flex flex-wrap gap-1 text-sm justify-center line-clamp-1">
                            <p className="text-[var(--foreground-secondary)] font-normal">
                              {currency}
                              {formatAmount(
                                discountPrice != 0 && discountPrice !== price
                                  ? discountPrice
                                  : price,
                                decimals
                              )}
                            </p>
                            {discountPrice != 0 &&
                            discountPrice !== price ? (
                              <p className="text-[var(--foreground-tertiary)] font-normal line-through">
                                {currency}
                                {formatAmount(price, decimals)}
                              </p>
                            ) : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

                {/* Policies as quiet chips instead of a large panel. */}
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--surface-subtle)] py-1.5 pl-2 pr-3 text-xs font-medium text-[var(--foreground-secondary)]">
                    <span className="relative size-4 shrink-0">
                      <Image fill src={productDetails?.cancelable_status == 1 ? Cancelable : NonCancelable} alt="" />
                    </span>
                    {productDetails?.cancelable_status == 1 ? (
                      <>
                        {t("cancelable")}
                        {tillStatusLabel ? ` · ${tillStatusLabel}` : ""}
                      </>
                    ) : (
                      t("non-cancelable")
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--surface-subtle)] py-1.5 pl-2 pr-3 text-xs font-medium text-[var(--foreground-secondary)]">
                    <span className="relative size-4 shrink-0">
                      <Image fill src={productDetails?.return_status == 1 ? Returnable : NotReturnable} alt="" />
                    </span>
                    {productDetails?.return_status == 1
                      ? `${t("returnable")} ${productDetails?.return_days} ${t("days")}`
                      : t("non-returnable")}
                  </span>
                  {hasFssai && (
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--surface-subtle)] py-1.5 pl-2 pr-3 text-xs font-medium text-[var(--foreground-secondary)]">
                      {productDetails?.fssai_lic_img && (
                        <Image width={16} height={16} src={productDetails?.fssai_lic_img} className="object-contain" alt="" />
                      )}
                      {t("fssai_license_no")} {productDetails?.fssai_lic_no}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-col gap-4 pt-1">
                  {isVariantAvailable ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-11 shrink-0 items-center rounded-lg border border-[var(--border-default)]">
                        <button
                          type="button"
                          aria-label={t("decrease_quantity")}
                          className="grid h-full w-10 place-items-center text-[var(--foreground-primary)] disabled:opacity-40"
                          onClick={handleDecreaseQuantity}
                          disabled={quantity <= 1}
                        >
                          <FiMinus />
                        </button>
                        <span className="w-7 text-center text-base font-semibold tabular-nums text-[var(--foreground-primary)]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={t("increase_quantity")}
                          className="grid h-full w-10 place-items-center text-[var(--foreground-primary)]"
                          onClick={handleIncreseQuantity}
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-background-default)] px-4 text-base font-semibold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] active:bg-[var(--button-primary-background-pressed)] disabled:opacity-70"
                        onClick={foodFlow.isFoodModule ? () => foodFlow.openFlow() : handleAddToCart}
                        onMouseEnter={foodFlow.isFoodModule ? foodFlow.prefetch : undefined}
                        disabled={foodFlow.loading}
                        aria-busy={foodFlow.showSpinner}
                      >
                        <FaShoppingBasket size={18} className="shrink-0" />
                        <span className="truncate">{t("add_to_cart")}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={isFavorite ? t("removeTowishlist") : t("addToWishlist")}
                        aria-pressed={isFavorite}
                        className="grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--border-default)] transition-colors hover:border-[var(--brand-border-default)]"
                        onClick={handleProductLikes}
                      >
                        {isFavorite ? (
                          <BiSolidHeart size={20} className="fill-[var(--brand-background-default)]" />
                        ) : (
                          <BiHeart size={20} className="text-[var(--foreground-secondary)]" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-11 items-center justify-center rounded-lg bg-[var(--status-error-background)] text-sm font-semibold text-[var(--status-error-default)]">
                      {t("OutOfStock")}
                    </div>
                  )}

                  <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
                    <span className="text-xs font-medium text-[var(--foreground-tertiary)]">{t("share")}</span>
                    <div className="flex items-center gap-2">
                      <WhatsappShareButton url={`${process.env.NEXT_PUBLIC_BASE_URL}/product/${product?.slug}`}>
                        <WhatsappIcon className="size-7 rounded-full" />
                      </WhatsappShareButton>
                      <TwitterShareButton url={`${process.env.NEXT_PUBLIC_BASE_URL}/product/${product?.slug}`}>
                        <TwitterIcon className="size-7 rounded-full" />
                      </TwitterShareButton>
                      <FacebookShareButton url={`${process.env.NEXT_PUBLIC_BASE_URL}/product/${product?.slug}`}>
                        <FacebookIcon className="size-7 rounded-full" />
                      </FacebookShareButton>
                      <button
                        type="button"
                        aria-label={t("copy_link")}
                        className="grid size-7 place-items-center rounded-full bg-[var(--surface-inverse)] text-[var(--foreground-inverse)]"
                        onClick={handleCopyToClipboard}
                      >
                        <FaLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <SingleSellerConfirmationModal
          showSingleSellerModal={showSingleSellerModal}
          setSingleSellerModal={setSingleSellerModal}
          product={product}
          selectedVariant={selectVariant}
        />
      </Dialog>
      {foodFlow.showAddonModal ? (
        <AddonCustomizationModal
          product={foodFlow.detailedProduct}
          variant={selectVariant}
          showAddonModal={foodFlow.showAddonModal}
          setShowAddonModal={foodFlow.setShowAddonModal}
        />
      ) : null}
      {foodFlow.showRepeatModal ? (
        <RepeatCustomizationModal
          product={foodFlow.detailedProduct}
          cartLine={foodFlow.repeatLine}
          showRepeatModal={foodFlow.showRepeatModal}
          setShowRepeatModal={foodFlow.setShowRepeatModal}
          onChooseMyself={foodFlow.handleChooseMyself}
        />
      ) : null}
    </>
  );
};

export default ProductDetailModal;
