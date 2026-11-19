import React, { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa";
import { LocalizedLink } from "@/utils/localizedNav";
import { t } from "@/utils/translation";
import { getDefaultVariant, isVariantBuyable } from "@/utils/cartRowUtils";
import { MdArrowDropDown } from "react-icons/md";
import VariantsModal from "../variantsmodal/VariantsModal";
import AddonCustomizationModal from "../addon-customization-modal/AddonCustomizationModal";
import ProductDetailModal from "../productdetailmodal/ProductDetailModal";
import { useDispatch, useSelector } from "react-redux";
import {
  addGuestCartTotal,
  addtoGuestCart,
  setCart,
  setCartProducts,
  setCartSubTotal,
  subGuestCartTotal,
} from "@/redux/slices/cartSlice";
import * as api from "@/api/apiRoutes";
import { toast } from "react-toastify";
import { BiHeart, BiSolidHeart } from "react-icons/bi";
import { setFavoriteProductIds } from "@/redux/slices/FavoriteSlice";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import SingleSellerConfirmationModal from "../single-seller-confirmation-modal/SingleSellerConfirmationModal";
import ProductCartControl from "./ProductCartControl";
import { isRtl, formatPriceDisplay } from "@/lib/utils";
import { getVariantLabel, getVariantImage, normalizeImage } from "@/utils/variantUtils";
import { useFoodCustomizeFlow } from "@/utils/useFoodCustomizeFlow";
import RepeatCustomizationModal from "../addon-customization-modal/RepeatCustomizationModal";
import { GoEye } from "react-icons/go";
import type { AppDispatch } from "@/redux/hooks";
import type { Id } from "@/types/common";
import type { CartLine, GuestCartLine } from "@/types/models/cart";
import type { Product, ProductVariant } from "@/types/models/product";
import type { RootState } from "@/types/state";

/** Per-product quantity summed across cart lines (getProductQuantities). */
type ProductQty = { product_id: number; qty: number };
type CardEvent = React.MouseEvent<HTMLElement>;

export interface VerticleProductCardProps {
  product: Product;
  largeImage?: boolean;
  // Denser card for 3-up mobile grids; only takes effect below the sm breakpoint.
  compact?: boolean;
}

// The customise/repeat sheets are a Food Delivery-only flow — other modules'
// multi-variant products (grocery size/pack options, etc.) keep the existing
// plain VariantsModal untouched.
const VerticleProductCard = ({ product, largeImage = false, compact = false }: VerticleProductCardProps) => {
  const sm = (cls: string) => (compact ? ` ${cls}` : "");
  const isLtr = isRtl();
  const dispatch = useDispatch<AppDispatch>();

  const cart = useSelector((state: RootState) => state.Cart);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const user = useSelector((state: RootState) => state.User);
  const favoriteProducts = useSelector(
    (state: RootState) => state.Favorite.favouriteProductIds
  );

  // Starts as [] until the effect below picks a variant.
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>([] as unknown as ProductVariant);
  const [showVariants, setShowVariants] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showSingleSellerModal, setSingleSellerModal] = useState(false);
  const foodFlow = useFoodCustomizeFlow({
    product,
    onPlainAdd: () => plainAddToCart(),
    onPlainIncrease: () => plainIncreaseQuantity(),
  });

  useEffect(() => {
    // §5.2: buyable variants first, so the card and the product page always
    // land on the same default. The old test was `is_unlimited_stock === 0 &&
    // stock > 0`, which calls an UNLIMITED variant out of stock — unlimited
    // products ship `stock: 0` — so a product whose first variant was sold out
    // defaulted to the sold-out one.
    setSelectedVariant(getDefaultVariant(product?.variants, product?.is_unlimited_stock));
  }, [product]);

  const calculateDiscount = (discountPrice: number, actualPrice: number) => {
    const difference = actualPrice - discountPrice;
    const actualDiscountPrice = difference / actualPrice;
    return actualDiscountPrice * 100;
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
  const addToCart = async (productId: Id | undefined, productVId: Id | undefined, qty: number) => {
    try {
      const response = await api.addToCart({
        product_id: productId,
        product_variant_id: productVId,
        qty: qty,
      });
      if (response.status === 1) {
        if (
          cart?.cartProducts?.find(
            (product) =>
              product?.product_id == productId &&
              product?.product_variant_id == productVId
          )?.qty == undefined
        ) {
          dispatch(setCart({ data: response }));
          const updatedCartCount = [
            ...cart?.cartProducts,
            { product_id: productId, product_variant_id: productVId, qty: qty } as CartLine,
          ];
          dispatch(setCartProducts({ data: updatedCartCount }));
          dispatch(setCartSubTotal({ data: response?.sub_total }));
        } else {
          const updatedProducts = cart?.cartProducts?.map((product) => {
            if (
              product.product_id == productId &&
              product?.product_variant_id == productVId
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

  const removeFromCart = async (productId: Id | undefined, variantId: Id | undefined) => {
    try {
      const response = await api.removeFromCart({
        product_id: productId,
        product_variant_id: variantId,
      });
      if (response?.status === 1) {
        const updatedProducts = cart?.cartProducts?.filter(
          (product) =>
            !(product?.product_id == productId &&
              product?.product_variant_id == variantId)
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
    productId: Id | undefined,
    productVariantId: Id | undefined,
    Qty: number,
    isExisting: number,
    flag: "add" | "remove"
  ) => {
    const finalPrice =
      selectedVariant?.discounted_price !== 0
        ? selectedVariant?.discounted_price as number
        : selectedVariant?.price as number;
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
            product?.product_variant_id == productVariantId
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
          (product) =>
            !(product?.product_id == productId &&
              product?.product_variant_id == productVariantId)
        );
      }
      dispatch(addtoGuestCart({ data: updatedProducts }));
    } else {
      if (flag == "add") {
        dispatch(addGuestCartTotal({ data: finalPrice }));
      } else if (flag == "remove") {
        dispatch(subGuestCartTotal({ data: finalPrice }));
      }
      // dispatch(addGuestCartTotal({ data: finalPrice }))
      const productData = {
        product_id: productId,
        product_variant_id: productVariantId,
        qty: Qty,
        productPrice: finalPrice,
        module_id: activeModuleId,
      } as GuestCartLine;
      dispatch(addtoGuestCart({ data: [...cart?.guestCart, productData] }));
    }
  };

  const handleValidateAddExistingGuestProduct = (
    productQuantity: ProductQty[],
    product: Product,
    quantity: number
  ) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;

    if (Number(product.is_unlimited_stock !== 0)) {
      if (productQty >= Number(product?.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        AddToGuestCart(
          product,
          product?.id,
          selectedVariant?.id,
          quantity,
          1,
          "add"
        );
      }
    } else {
      if (productQty >= Number(selectedVariant?.stock)) {
        toast.error(t("out_of_stock_message"));
      } else if (productQty >= Number(product?.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        AddToGuestCart(
          product,
          product?.id,
          selectedVariant?.id,
          quantity,
          1,
          "add"
        );
      }
    }
  };

  const handleAddNewProductGuest = (productQuantity: ProductQty[], product: Product) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;
    if (
      selectedVariant?.is_unlimited_stock == 0 &&
      selectedVariant?.stock == 0
    ) {
      toast.error(t("out_of_stock_message"));
    } else if (
      Number(productQty || 0) < Number(product.total_allowed_quantity)
    ) {
      AddToGuestCart(product, product?.id, selectedVariant?.id, 1, 0, "add");
    } else {
      toast.error(t("out_of_stock_message"));
    }
  };

  const handleValidateAddNewProduct = (productQuantity: ProductQty[], product: Product) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;

    if ((productQty || 0) >= Number(product?.total_allowed_quantity)) {
      toast.error(t("out_of_stock_message"));
    } else if (
      selectedVariant?.is_unlimited_stock == 0 &&
      (selectedVariant?.stock as number) <= 0
    ) {
      toast.error(t("out_of_stock_message"));
    } else if (cart?.cartProducts?.length >= (setting?.max_cart_items_count as number)) {
      toast.error(t("maximum_cart_quantity_reach"));
    } else if (Number(product.is_unlimited_stock)) {
      addToCart(product?.id, selectedVariant!.id, 1);
    } else {
      if (selectedVariant?.status) {
        addToCart(product?.id, selectedVariant?.id, 1);
      } else {
        toast.error(t("out_of_stock_message"));
      }
    }
  };

  const plainAddToCart = () => {
    const quantity = getProductQuantities(cart?.cartProducts);
    if (cart?.isGuest) {
      handleAddNewProductGuest(quantity, product);
    } else {
      handleValidateAddNewProduct(quantity, product);
    }
  };

  const handleIntialAddToCart = (e: CardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Food module routes every Add through the customise/repeat sheets; it
    // falls back to a plain add when there is nothing to customise.
    if (foodFlow.isFoodModule) {
      foodFlow.openFlow();
      return;
    }
    plainAddToCart();
  };

  const handleValidateAddExistingProduct = (productQuantity: ProductQty[], product: Product) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id
    )?.qty as number;
    if (Number(product.is_unlimited_stock)) {
      if (productQty < Number(product?.total_allowed_quantity)) {
        addToCart(
          product?.id,
          selectedVariant?.id,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == selectedVariant?.id
          )?.qty as number) + 1
        );
      } else {
        toast.error(t("max_cart_limit_error"));
      }
    } else {
      if (productQty >= Number(selectedVariant!.stock)) {
        toast.error(t("out_of_stock_message"));
      } else if (Number(productQty) >= Number(product.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        addToCart(
          product?.id,
          selectedVariant?.id,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == selectedVariant?.id
          )?.qty as number) + 1
        );
      }
    }
  };

  const plainIncreaseQuantity = () => {
    if (cart?.isGuest) {
      const productQuantity = getProductQuantities(cart?.guestCart);
      handleValidateAddExistingGuestProduct(
        productQuantity,
        product,
        (cart?.guestCart?.find(
          (prdct) =>
            prdct?.product_id == product?.id &&
            prdct?.product_variant_id == selectedVariant?.id
        )?.qty as number) + 1
      );
    } else {
      const quantity = getProductQuantities(cart?.cartProducts);
      handleValidateAddExistingProduct(quantity, product);
    }
  };

  const handleQuantityIncrease = (e: CardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Adding another one asks whether to repeat the last customisation.
    if (foodFlow.isFoodModule) {
      foodFlow.openFlow({ increase: true });
      return;
    }
    plainIncreaseQuantity();
  };

  const handleQuantityDecrease = (e: CardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (foodFlow.isFoodModule) {
      foodFlow.decrementLatestLine();
      return;
    }
    if (cart?.isGuest) {
      AddToGuestCart(
        product,
        product?.id,
        selectedVariant?.id,
        (cart?.guestCart?.find(
          (prdct) => prdct?.product_variant_id == selectedVariant?.id
        )?.qty as number) - 1,
        1,
        "remove"
      );
    } else {
      if (
        cart?.cartProducts?.find(
          (prdct) => prdct?.product_variant_id == selectedVariant?.id
        )!.qty == 1
      ) {
        removeFromCart(product?.id, selectedVariant?.id);
      } else {
        addToCart(
          product?.id,
          selectedVariant?.id,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == selectedVariant?.id
          )?.qty as number) - 1
        );
      }
    }
  };

  const handleShowVariantModal = (e: CardEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (foodFlow.isFoodModule) {
      foodFlow.openFlow();
    } else if (product.variants.length > 1) {
      // Non-food keeps the per-row stepper sheet — do not regress it.
      setShowVariants(true);
    }
  };

  const handleShowDetailModal = (e: CardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Latest intent wins: an Add still waiting on the network must not open
    // its sheet on top of the quick view.
    foodFlow.cancelPending();
    setShowProductDetail(true);
  };

  const handleProductLikes = async (e: CardEvent) => {
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

  const productsVariants = product?.variants;


  // Food delivery: add-ons let one product sit in the cart as several rows, so
  // the card reflects every row of this product rather than one variant's.
  const foodCartQty = (
    (cart?.isGuest ? cart?.guestCart : cart?.cartProducts) || []
  )
    .filter((line) => String(line?.product_id) === String(product?.id))
    .reduce((sum, line) => sum + (Number(line?.qty) || 0), 0);

  const isProductAlreadyAdded = foodFlow.isFoodModule
    ? foodCartQty > 0
    :
    (cart?.isGuest === false &&
      (cart?.cartProducts?.find(
        (prdct) => prdct?.product_variant_id == selectedVariant?.id
      )?.qty as number) > 0) ||
    (cart?.isGuest === true &&
      (cart?.guestCart?.find(
        (prdct) => prdct?.product_variant_id === selectedVariant?.id
      )?.qty as number) > 0);

  const addedQuantity = foodFlow.isFoodModule
    ? foodCartQty
    :
    cart.isGuest === false
      ? cart?.cartProducts?.find(
        (prdct) => prdct?.product_variant_id == selectedVariant?.id
      )?.qty
      : cart?.guestCart?.find(
        (prdct) => prdct?.product_variant_id == selectedVariant?.id
      )?.qty;

  // §5.1, one stock rule: a variant is buyable when it is switched on AND
  // (the product is unlimited OR it has stock). The product is sold out when
  // the SELECTED variant is not buyable, or the product itself is off.
  const isProductAvailabel =
    product?.status == 0 ||
    !isVariantBuyable({
      status: selectedVariant?.status,
      stock: selectedVariant?.stock,
      isUnlimitedStock: selectedVariant?.is_unlimited_stock ?? product?.is_unlimited_stock,
    });

  return (
    <div {...foodFlow.hoverPrefetchProps}>
      <LocalizedLink
        href={`/product/${product?.slug}`}
        className={`flex flex-col gap-3 group w-full${sm("max-sm:gap-1.5")}`}
      >
        {/* Image box — bordered per Kigen card spec; fluid, scales with grid cell */}
        <div className={`relative self-stretch aspect-square w-full rounded-2xl${sm("max-sm:rounded-xl")} bg-[var(--surface-subtle)] border border-[var(--border-subtle)] overflow-hidden`}>
          <ImageWithPlaceholder
            className="object-contain h-full w-full"
            alt={product?.translations?.name ?? product?.name}
            src={
              normalizeImage(product?.image_url) ||
              getVariantImage(selectedVariant, product?.image_url)
            }
            width={300}
            height={300}
            priority={true}
          />

          {/* Quick view (hover) */}
          <ul className="absolute right-2 top-2 lg:flex flex-col gap-2 translate-x-3 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out hidden">
            {/* Wishlist action hidden for now — keep for when it's brought back.
            <li
              className="size-8 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--brand-border-default)] flex justify-center items-center bg-[var(--surface-default)]"
              onClick={handleProductLikes}
            >
              <span>
                {favoriteProducts && favoriteProducts?.includes(product?.id) ? (
                  <BiSolidHeart size={18} className="fill-[var(--brand-background-default)]" />
                ) : (
                  <BiHeart size={18} className="text-[var(--foreground-tertiary)] hover:text-[var(--brand-foreground-default)]" />
                )}
              </span>
            </li>
            */}
            {/* Click on the whole button, as in the horizontal/list cards: with
                only the 18px icon clickable, the rest of the button fell through
                to the card's product link. */}
            <li
              className="size-8 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--brand-border-default)] flex justify-center items-center bg-[var(--surface-default)] cursor-pointer"
              onClick={handleShowDetailModal}
              onMouseEnter={foodFlow.prefetch}
            >
              <GoEye size={18} className="text-[var(--foreground-tertiary)] hover:text-[var(--brand-foreground-default)]" />
            </li>
          </ul>

          {/* Add to cart / quantity stepper (bottom-right, per spec) */}
          <div
            className={`absolute bottom-2 right-2${sm("max-sm:bottom-1 max-sm:right-1")}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {!isProductAvailabel ? (
              <ProductCartControl
                isAdded={isProductAlreadyAdded}
                quantity={addedQuantity}
                variantCount={productsVariants?.length}
                onIncrease={handleQuantityIncrease}
                onDecrease={handleQuantityDecrease}
                onAdd={handleIntialAddToCart}
                onShowVariants={(e) => handleShowVariantModal(e, product)}
                showOptionsButton={!foodFlow.isFoodModule || !isProductAlreadyAdded}
                busy={foodFlow.showSpinner}
                onPrefetch={foodFlow.isFoodModule ? foodFlow.prefetch : undefined}
              />
            ) : null}
          </div>
        </div>

        {/* Info */}
        <div className={`flex flex-col gap-2${sm("max-sm:gap-1")}`}>
          {/* rating + weight */}
          <div className="flex items-center gap-2">
            {(product?.average_rating as number) > 0 && product?.product_rating == true ? (
              <>
                <div className="flex items-center gap-1 ">
                  <FaStar size={16} className="text-[var(--status-warning-default)]" />
                  <span className="text-[var(--foreground-primary)] text-xs font-normal">
                    {product?.average_rating}
                  </span>
                </div>
                <span className="h-4 w-px bg-[var(--border-default)]" />
              </>
            ) : null}
            {/* <button
              onClick={(e) => handleShowVariantModal(e, product)}
              className="flex items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-normal text-[var(--foreground-primary)]"
            >
              {getVariantLabel(selectedVariant)}
              {productsVariants?.length > 1 ? <MdArrowDropDown size={14} /> : null}
            </button> */}
            <div className={`text-[var(--foreground-primary)] text-xs font-semibold line-clamp-1${sm("max-sm:text-[11px] max-sm:leading-4")}`}>
                {getVariantLabel(selectedVariant)}
            </div>
          </div>

          {/* title + price */}
          <div className={`flex flex-col gap-1${sm("max-sm:gap-0.5")}`}>
            <h3 className={`text-[var(--foreground-primary)] text-sm md:text-base font-semibold leading-6 line-clamp-2 capitalize group-hover:text-[var(--brand-foreground-default)]${sm("max-sm:text-xs max-sm:leading-4")}`}>
              {product?.translations?.name ?? product?.name}
            </h3>

            {!isProductAvailabel ? (
              <div className={`flex items-center gap-1 flex-wrap${sm("max-sm:gap-x-1 max-sm:gap-y-0")}`}>
                {selectedVariant?.discounted_price !== 0 &&
                selectedVariant?.discounted_price !== selectedVariant?.price ? (
                  <>
                    <span className={`text-[var(--foreground-secondary)] text-sm font-medium${sm("max-sm:text-xs")}`}>
                      {setting?.currency}
                      {formatPriceDisplay(selectedVariant?.discounted_price)}
                    </span>
                    <span className={`text-[var(--foreground-tertiary)] text-sm font-medium line-through${sm("max-sm:text-[11px]")}`}>
                      {setting?.currency}
                      {formatPriceDisplay(selectedVariant?.price)}
                    </span>
                  </>
                ) : (
                  <span className={`text-[var(--foreground-secondary)] text-sm font-medium${sm("max-sm:text-xs")}`}>
                    {setting?.currency}
                    {formatPriceDisplay(selectedVariant?.price)}
                  </span>
                )}
              </div>
            ) : (
              <span className={`text-[var(--status-error-default)] text-xs font-medium${sm("max-sm:text-[11px]")}`}>
                {t("OutOfStock")}
              </span>
            )}
          </div>

          {/* discount % */}
          {!isProductAvailabel &&
          selectedVariant?.discounted_price !== 0 &&
          selectedVariant?.discounted_price !== selectedVariant?.price ? (
            <span className={`text-[var(--status-success-foreground)] text-sm font-bold leading-5${sm("max-sm:text-[11px] max-sm:leading-4")}`}>
              {Math.round(
                calculateDiscount(
                  selectedVariant?.discounted_price as number,
                  selectedVariant?.price as number
                )
              )}
              % {t("off")}
            </span>
          ) : null}
        </div>
      </LocalizedLink>
      <ProductDetailModal
        product={product}
        showDetailModal={showProductDetail}
        setShowDetailModal={setShowProductDetail}
      />
      <VariantsModal
        product={product}
        showVariants={showVariants}
        setShowVariants={setShowVariants}
      />
      {foodFlow.showAddonModal ? (
        <AddonCustomizationModal
          product={foodFlow.detailedProduct}
          variant={selectedVariant}
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
      <SingleSellerConfirmationModal
        showSingleSellerModal={showSingleSellerModal}
        setSingleSellerModal={setSingleSellerModal}
        product={product}
        selectedVariant={selectedVariant}
      />
    </div>
  );
};

export default VerticleProductCard;
