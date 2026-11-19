import React, { useState } from "react";
import { FaMinus, FaPlus, FaShoppingBasket } from "react-icons/fa";
import { BiTrash } from "react-icons/bi";
import * as api from "@/api/apiRoutes";
import { useDispatch, useSelector } from "react-redux";
import { IoMdArrowDropdown } from "react-icons/io";
import VariantsModal from "../variantsmodal/VariantsModal";
import {
  setCart,
  setCartProducts,
  setCartSubTotal,
} from "@/redux/slices/cartSlice";
import { toast } from "react-toastify";
import { t } from "@/utils/translation";
import { formatPriceDisplay } from "@/lib/utils";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import SingleSellerConfirmationModal from "../single-seller-confirmation-modal/SingleSellerConfirmationModal";
import { getProductImage } from "@/utils/variantUtils";
import type { AppDispatch } from "@/redux/hooks";
import type { Id } from "@/types/common";
import type { CartLine } from "@/types/models/cart";
import type { Product } from "@/types/models/product";
import type { RootState } from "@/types/state";

type ProductQty = { product_id: number; qty: number };
type CardEvent = React.MouseEvent<HTMLElement>;

export interface WishlistCardProps {
  product: Product;
  wishlistProducts: Product[];
  setWishlistProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  handleFetchLikedProducts: () => Promise<void> | void;
}

const WishlistCard = ({
  product,
  setWishlistProducts,
  wishlistProducts,
  setTotal,
  handleFetchLikedProducts,
}: WishlistCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const cart = useSelector((state: RootState) => state.Cart);

  const [showVariants, setShowVariants] = useState(false);
  const [showSingleSellerModal, setSingleSellerModal] = useState(false);

  const getProductQuantities = (products: { product_id: Id; qty: number }[] | undefined): ProductQty[] => {
    return Object.entries(
      products!?.reduce<Record<string, number>>((quantities, product) => {
        const existingQty = quantities[product.product_id] || 0;
        return {
          ...quantities,
          [product.product_id]: existingQty + product.qty,
        };
      }, {}),
    ).map(([productId, qty]) => ({
      product_id: parseInt(productId),
      qty,
    }));
  };

  const handleRemoveFromWishlist = async (prdctId: Id) => {
    try {
      const response = await api.removeFromFavorite({ product_id: prdctId });
      if (response.status == 1) {
        const updateProducts = wishlistProducts?.filter(
          (prdct) => prdct?.id != prdctId,
        );
        setWishlistProducts(updateProducts);
        setTotal((prevTotal) => prevTotal - 1);
        await handleFetchLikedProducts();
      } else {
        console.log(response.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleShowVariatModal = () => {
    if (product?.variants?.length > 0) {
      setShowVariants(true);
    } else {
      return;
    }
  };

  const handleQuantityIncrease = (e: CardEvent) => {
    const quantity = getProductQuantities(cart?.cartProducts);
    handleValidateAddExistingProduct(quantity, product);
  };
  const handleQuantityDecrease = (e: CardEvent) => {
    if (
      cart?.cartProducts?.find(
        (prdct) => prdct?.product_variant_id == product?.variants[0]?.id,
      )!.qty == 1
    ) {
      removeFromCart(product?.id, product?.variants[0]?.id);
    } else {
      addToCart(
        product.id,
        product?.variants[0].id,
        (cart?.cartProducts?.find(
          (prdct) => prdct?.product_variant_id == product?.variants[0]?.id,
        )?.qty as number) - 1,
      );
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
              product?.product_variant_id == variantId),
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
  const handleValidateAddExistingProduct = (productQuantity: ProductQty[], product: Product) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id,
    )?.qty as number;
    if (Number(product.is_unlimited_stock)) {
      if (productQty < Number(product?.total_allowed_quantity)) {
        addToCart(
          product.id,
          product?.variants[0]?.id,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == product?.variants[0]?.id,
          )?.qty as number) + 1,
        );
      } else {
        toast.error(t("max_cart_limit_error"));
      }
    } else {
      if (productQty >= Number(product?.variants[0].stock)) {
        toast.error(t("out_of_stock_message"));
      } else if (Number(productQty) >= Number(product.total_allowed_quantity)) {
        toast.error(t("max_cart_limit_error"));
      } else {
        addToCart(
          product.id,
          product?.variants[0]?.id,
          (cart?.cartProducts?.find(
            (prdct) => prdct?.product_variant_id == product?.variants[0]?.id,
          )?.qty as number) + 1,
        );
      }
    }
  };

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
              product?.product_variant_id == productVId,
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

  const handleValidateAddNewProduct = (productQuantity: ProductQty[], product: Product) => {
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id,
    )?.qty as number;

    if ((productQty || 0) >= Number(product?.total_allowed_quantity)) {
      toast.error(t("out_of_stock_message"));
    } else if (productQty >= Number(product?.total_allowed_quantity)) {
      toast.error(t("max_cart_limit_error"));
    } else if (Number(product.is_unlimited_stock)) {
      addToCart(product.id, product?.variants[0].id, 1);
    } else {
      if (product?.variants[0]?.status) {
        addToCart(product.id, product?.variants[0]?.id, 1);
      } else {
        toast.error(t("out_of_stock_message"));
      }
    }
  };

  const handleIntialAddToCart = (e: CardEvent) => {
    const quantity = getProductQuantities(cart?.cartProducts);
    handleValidateAddNewProduct(quantity, product);
  };

  const isProductAlreadyAdded =
    cart?.isGuest === false &&
    (cart?.cartProducts?.find(
      (prdct) => prdct?.product_variant_id == product?.variants[0]?.id,
    )?.qty as number) > 0;
  const addedQuantity = cart?.cartProducts?.find(
    (prdct) => prdct?.product_variant_id == product?.variants[0]?.id,
  )?.qty;

  return (
    <div className="w-full overflow-hidden border-b border-[var(--border-subtle)] p-4">
      <div className="lg:grid grid-cols-12 items-center gap-6 hidden">
        {/* Product Image and Details */}
        <div className="col-span-7 xl:col-span-6 flex items-center gap-2">
          <div className="h-16 w-16 flex-shrink-0 rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
            <ImageWithPlaceholder
              src={getProductImage(product)}
              alt="Image"
              className="h-full w-full rounded object-cover"
              height={400}
              width={400}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="line-clamp-1 text-base font-normal leading-6 text-[var(--foreground-primary)]">
              {product?.translations?.name ?? product?.name}
            </h2>
            <p
              className="flex cursor-pointer items-center gap-1 text-sm font-normal leading-4 text-[var(--foreground-tertiary)]"
              onClick={handleShowVariatModal}
            >
              {product?.variants[0]?.measurement}
              {product?.variants[0]?.unit?.translations?.name}
              {product?.variants?.length > 1 && <IoMdArrowDropdown />}
            </p>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="col-span-2 xl:col-span-3 flex items-center justify-center">
          {isProductAlreadyAdded ? (
            <div className="flex h-[30px] w-[100px] justify-between overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-default)]">
              <button
                className="flex w-8 items-center justify-center bg-[var(--button-primary-background-default)] text-sm font-bold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] md:p-1"
                onClick={handleQuantityDecrease}
              >
                <FaMinus />
              </button>
              <input
                value={addedQuantity}
                disabled
                className="h-full w-full bg-transparent text-center text-[var(--foreground-primary)]"
                min="1"
                max={product?.variants[0]?.stock}
              />
              <button
                className="flex w-8 items-center justify-center bg-[var(--button-primary-background-default)] text-sm font-bold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] md:p-1"
                onClick={handleQuantityIncrease}
              >
                <FaPlus />
              </button>
            </div>
          ) : (
            <button
              className="flex w-[100px] items-center justify-center gap-1.5 rounded-lg bg-[var(--status-warning-background)] p-2 text-base font-medium leading-6 text-[var(--status-warning-foreground)]"
              onClick={handleIntialAddToCart}
            >
              <FaShoppingBasket size={22} />
              {t("add")}
            </button>
          )}
        </div>

        {/* Product Price */}
        <div className="col-span-2 text-center">
          {product?.variants[0]?.discounted_price !== 0 ? (
            <>
              <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {setting?.currency}
                {formatPriceDisplay(product?.variants[0]?.discounted_price)}
              </p>
              <p className="m-1 text-sm font-normal leading-4 line-through text-[var(--foreground-tertiary)]">
                {setting?.currency}
                {formatPriceDisplay(product?.variants[0]?.price)}
              </p>
            </>
          ) : (
            <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
              {setting?.currency}
              {formatPriceDisplay(product?.variants[0]?.price)}
            </p>
          )}
        </div>

        {/* Remove Button */}
        <div className="col-span-1 text-center">
          <button
            className="text-[var(--status-error-default)] transition-colors hover:text-[var(--status-error-foreground)]"
            onClick={() => handleRemoveFromWishlist(product?.id)}
          >
            <BiTrash size={24} />
          </button>
        </div>
      </div>

      {/* Tab and Mobile Cards */}
      <div className="flex flex-col lg:hidden w-full overflow-hidden gap-3">
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="h-16 w-16 flex-shrink-0 rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
              <ImageWithPlaceholder
                src={getProductImage(product)}
                alt="Image"
                className="h-full w-full rounded object-cover"
                height={400}
                width={400}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="line-clamp-1 text-base font-normal leading-6 text-[var(--foreground-primary)]">
                {product?.translations?.name ?? product?.name}
              </h2>
              <p
                className="flex cursor-pointer items-center gap-1 text-sm font-normal leading-4 text-[var(--foreground-tertiary)]"
                onClick={handleShowVariatModal}
              >
                {product?.variants[0]?.measurement}
                {product?.variants[0]?.stock_unit_name}
                {product?.variants?.length > 1 && <IoMdArrowDropdown />}
              </p>
            </div>
          </div>
          {/* Price sizes to its content — a fixed narrow column clipped longer
              amounts against the card's overflow-hidden. */}
          <div className="shrink-0 whitespace-nowrap text-right">
            {product?.variants[0]?.discounted_price !== 0 ? (
              <>
                <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {setting?.currency}
                  {formatPriceDisplay(product?.variants[0]?.discounted_price)}
                </p>
                <p className="m-1 text-sm font-normal leading-4 line-through text-[var(--foreground-tertiary)]">
                  {setting?.currency}
                  {formatPriceDisplay(product?.variants[0]?.price)}
                </p>
              </>
            ) : (
              <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {setting?.currency}
                {formatPriceDisplay(product?.variants[0]?.price)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 w-full">
          {/* Quantity Selector */}
          <div className="flex items-start justify-start">
            {isProductAlreadyAdded ? (
              <div className="my-1 flex h-[30px] w-[100px] justify-between overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-default)]">
                <button
                  className="flex w-8 items-center justify-center bg-[var(--button-primary-background-default)] text-sm font-bold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] md:p-1"
                  onClick={handleQuantityDecrease}
                >
                  <FaMinus />
                </button>
                <input
                  value={addedQuantity}
                  disabled
                  className="h-full w-full bg-transparent text-center text-[var(--foreground-primary)]"
                  min="1"
                  max={product?.variants[0]?.stock}
                />
                <button
                  className="flex w-8 items-center justify-center bg-[var(--button-primary-background-default)] text-sm font-bold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] md:p-1"
                  onClick={handleQuantityIncrease}
                >
                  <FaPlus />
                </button>
              </div>
            ) : (
              <button
                className="flex w-[100px] items-center justify-center gap-1.5 rounded-lg bg-[var(--status-warning-background)] p-2 text-base font-medium leading-6 text-[var(--status-warning-foreground)]"
                onClick={handleIntialAddToCart}
              >
                <FaShoppingBasket size={22} />
                {t("add")}
              </button>
            )}
          </div>
          {/* Remove Button */}
          <div className="shrink-0 text-center">
            <button
              className="text-[var(--status-error-default)] transition-colors hover:text-[var(--status-error-foreground)]"
              onClick={() => handleRemoveFromWishlist(product?.id)}
            >
              <BiTrash size={24} />
            </button>
          </div>
        </div>
      </div>
      {/* Variants Modal */}
      <VariantsModal
        product={product}
        showVariants={showVariants}
        setShowVariants={setShowVariants}
      />
      <SingleSellerConfirmationModal
        showSingleSellerModal={showSingleSellerModal}
        setSingleSellerModal={setSingleSellerModal}
        product={product}
        selectedVariant={product?.variants[0]}
      />
    </div>
  );
};

export default WishlistCard;
