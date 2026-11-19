"use client";
import React, { use, useEffect, useRef, useState } from "react";
import { useServerData } from "@/utils/useServerData";
import { useServerSeed } from "@/utils/useServerSeed";
import type { ApiResponse } from "@/types/api";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { slugFromModuleId } from "@/utils/moduleSlug";
import { formatPriceDisplay } from "@/lib/utils";
import * as api from "@/api/apiRoutes";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  FaLink,
  FaShoppingBasket,
  FaStar,
  FaStarHalfAlt,
} from "react-icons/fa";
import { FiMinus, FiPlus } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { t } from "@/utils/translation";
import { buyableFirst, getDefaultVariant } from "@/utils/cartRowUtils";
import VegIcon from "@/assets/VegIcon.svg";
import NonVegIcon from "@/assets/NonVegIcon.svg";
import ProductNotFoundImage from "@/assets/not_found_images/No_product_found.svg";
// Inline SVG components so cancel/return icons pick up the brand colour from
// their parent's text colour — the .svg assets have the green baked in.
import CancelableIcon from "../icons/CancelableIcon";
import NotCancelableIcon from "../icons/NotCancelableIcon";
import ReturnableIcon from "../icons/ReturnableIcon";
import NotReturnableIcon from "../icons/NotReturnableIcon";
import {
  WhatsappShareButton,
  WhatsappIcon,
  TwitterIcon,
  TwitterShareButton,
  FacebookIcon,
  FacebookShareButton,
} from "react-share";
import ProductDescription from "./ProductDescription";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import Loader from "../loader/Loader";
import { toast } from "react-toastify";
import {
  addtoGuestCart,
  setCart,
  setCartProducts,
  setCartSubTotal,
  setGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { setFavoriteProductIds } from "@/redux/slices/FavoriteSlice";
import { BiHeart, BiSolidHeart } from "react-icons/bi";
import SimilarProducts from "../productslist/SimilarProducts";
import { usePathname } from "next/navigation";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import SingleSellerConfirmationModal from "../single-seller-confirmation-modal/SingleSellerConfirmationModal";
import { LocalizedLink } from "@/utils/localizedNav";
import ProductZoomImage from "./ProductZoomImage";
import { useSsrMediaQuery } from "@/utils/useSsrMediaQuery";
import {
  clearAllFilter,
  setFilterBySeller,
} from "@/redux/slices/productFilterSlice";
import RecentalyViewedProducts from "../productslist/RecentalyViewedProducts";
import ProductDetailSkeleton from "../skeleton/ProductDetailSkeleton";
import { useRedirectHomeOnModuleChange } from "@/utils/useRedirectHomeOnModuleChange";
import {
  buildAttributes,
  buildVariantGallery,
  getVariantSelection,
  findVariant,
  getVariantLabel,
  hasAttributeVariants,
} from "@/utils/variantUtils";
import { useFoodCustomizeFlow } from "@/utils/useFoodCustomizeFlow";
import AddonCustomizationModal from "../addon-customization-modal/AddonCustomizationModal";
import RepeatCustomizationModal from "../addon-customization-modal/RepeatCustomizationModal";
import type { AppDispatch } from "@/redux/hooks";
import type { Id, Numeric, Url } from "@/types/common";
import type {
  CartLine,
  GuestCartLine,
  Product,
  ProductRatingSummary,
  ProductVariant,
  VariantSelection,
} from "@/types/models";
import type { RootState } from "@/types/state";

const ProductDetail = () => {
  const isMobileScreen = useSsrMediaQuery({ query: "(max-width: 765px)" });

  const hasDispatched = useRef(false);
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  const { slug, module: urlModuleSlug } = router.query;
  const pathname = usePathname();
  const city = useSelector((state: RootState) => state.City.city);
  const setting = useSelector((state: RootState) => state.Setting);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const isRefetch = useSelector((state: RootState) => state.Shop.isRefetch);
  const cart = useSelector((state: RootState) => state.Cart);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const modules = useSelector((state: RootState) => state.Module.modules);
  const user = useSelector((state: RootState) => state.User);

  // A product can't exist in another module — on user module switch, go home.
  // (Shared links set the module via the global Layout reader, which this ignores.)
  useRedirectHomeOnModuleChange();
  const favoriteProducts = useSelector(
    (state: RootState) => state.Favorite.favouriteProductIds,
  );

  // product / selectVariant start as [] (not null) until the product loads; typed as loaded.
  const [product, setProduct] = useState<Product>([] as unknown as Product);
  const [selectVariant, setSelectedVariant] = useState<ProductVariant>([] as unknown as ProductVariant);
  const [selectedAttrs, setSelectedAttrs] = useState<VariantSelection>({});
  const [ratingData, setRatingData] = useState<ProductRatingSummary>({});
  const [quantity, setQuantity] = useState(1);
  const [productImages, setProductImages] = useState<Url[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [showSingleSellerModal, setSingleSellerModal] = useState(false);
  const [isVariantAvailable, setIsVariantAvailable] = useState(false);
  const [productNotAvailable, setProductNotAvailable] = useState(false);
  const [recentlyVisitedProduct, setRecentlyVisitedProduct] = useState<Product[]>([]);

  const copyCooldownRef = useRef(false);


  const ratingsCount = 10;

  const handleAddRecentlyViewedProduct = async (product: Product) => {
    try {
      if (user?.jwtToken) {
        await api.addRecentlyViewedProduct({ productId: product?.id });
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleFetchRecentlyViewedProducts = async (product: Product) => {
    try {
      if (user?.jwtToken) {
        const res = await api.getRecentlyViewedProducts({
          productId: product?.id,
        });
        if (res.status == 1) {
          setRecentlyVisitedProduct(res?.data);
        }
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  // Present only when the server rendered this page.
  const serverProduct = useServerData<ApiResponse<Product>>("product");

  const {
    isLoading: queryLoading,
    data: productResponse,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["product", slug, city?.latitude, city?.longitude, language, activeModuleId],
    queryFn: async () => {
      try {
        const res = await api.getProductById({
          slug: slug as string,
          latitude: city!.latitude,
          longitude: city!.longitude,
          id: -1,
        });
        return res;
      } catch (err) {
        console.error("API Crash:", err);
        throw err;
      }
    },
    enabled: !!slug && !!city?.latitude,
    // The server already fetched this product (SSR_PLAN.md §3.5). `initialData`
    // seeds whatever key the line above produced, so the key never has to be
    // rebuilt server-side — note it embeds the whole `language` object, which
    // would be easy to get subtly wrong.
    // Scoped to the key the SERVER rendered. `initialData` is not key-aware —
    // React Query applies it to whichever key the component currently computes —
    // so without this a module, city or language switch seeded the NEW key with
    // the OLD payload and, with staleTime below, never refetched it.
    initialData: useServerSeed(serverProduct, [
      slug,
      city?.latitude,
      city?.longitude,
      language,
      activeModuleId,
    ]),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  useEffect(() => {
    if (productResponse) {
      const res = productResponse;
      if (res.status == 1) {
        // Same default as the cards and quick view: first chip as displayed.
        const firstVariant = getDefaultVariant(res?.data?.variants, res?.data?.is_unlimited_stock) as ProductVariant;
        setProduct(res?.data);
        setSelectedVariant(firstVariant);
        setSelectedAttrs(getVariantSelection(firstVariant));
        const gallery = buildVariantGallery(res?.data, firstVariant);
        setProductImages(gallery);
        setSelectedImage(gallery[0] || "");
        handleAddRecentlyViewedProduct(res?.data);
        handleFetchRecentlyViewedProducts(res?.data);
      } else {
        setProductNotAvailable(true);
      }
    }
  }, [productResponse]);

  const handleIsVariantAvailable = () => {
    if (
      (product?.is_unlimited_stock == 0 && (selectVariant?.stock as number) <= 0) ||
      selectVariant?.status == 0
    ) {
      setIsVariantAvailable(false);
    } else {
      setIsVariantAvailable(true);
    }
  };

  useEffect(() => {
    handleIsVariantAvailable();
  }, [product, selectVariant]);

  const { data: ratingResponse } = useQuery({
    queryKey: ["product-ratings", product?.id],
    queryFn: () =>
      api.getProductRatings({
        id: product?.id,
        limit: ratingsCount,
        offset: 0,
      }),
    enabled: !!product?.id,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (ratingResponse?.data) {
      setRatingData(ratingResponse.data);
    }
  }, [ratingResponse]);
  const currency = setting?.setting?.currency;

  const attributes = buildAttributes(product?.variants);
  const isMultiAttribute = hasAttributeVariants(product?.variants);

  // Food module routes Add to Cart through the customise/repeat sheets, same
  // as the product cards — see useFoodCustomizeFlow.js for the branch logic.
  const foodFlow = useFoodCustomizeFlow({
    product,
    onPlainAdd: () => handleAddToCart(),
    onPlainIncrease: () => handleAddToCart(),
  });

  // Add-ons let one product sit in the cart as several rows, so the stepper
  // reflects every row of this product rather than one variant's.
  const foodCartQty = (
    (cart?.isGuest ? cart?.guestCart : cart?.cartProducts) || []
  )
    .filter((line) => String(line?.product_id) === String(product?.id))
    .reduce((sum, line) => sum + (Number(line?.qty) || 0), 0);

  const applyVariant = (variant: ProductVariant | undefined) => {
    if (!variant) return;
    setQuantity(1);
    setSelectedVariant(variant);
    setSelectedAttrs(getVariantSelection(variant));
    // Other variants' photos are excluded, so switching colour swaps the strip
    // instead of leaving the previous variant's shot sitting in front.
    const gallery = buildVariantGallery(product, variant);
    setProductImages(gallery);
    // gallery[0] is already this variant's own image when it has one.
    setSelectedImage(gallery[0] || "");
  };

  const handleChangeVariant = (variant: ProductVariant) => {
    applyVariant(variant);
  };

  // A value is available if some variant contains it together with the selected
  // values of all OTHER attributes (bidirectional: color and size constrain each
  // other equally).
  const isValueAvailable = (attributeId: Id, valueId: Id) => {
    return product?.variants?.some((variant) => {
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
    // Changing one attribute can invalidate the others — repick the first
    // available value for each so the combination always stays valid.
    attributes.forEach((attr) => {
      if (attr.id === attributeId) return;
      const matches = (valId: Id) =>
        product?.variants?.some((variant) => {
          const ids = variant?.attribute_values?.map((av) => av.id) || [];
          if (!ids.includes(valId)) return false;
          // must match every OTHER already-decided attribute in nextAttrs
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
    const variant = findVariant(product?.variants, nextAttrs);
    if (variant) {
      applyVariant(variant);
    } else {
      setSelectedAttrs(nextAttrs);
    }
  };
  const calculateDiscount = (discountPrice: number, actualPrice: number) => {
    const difference = actualPrice - discountPrice;
    const actualDiscountPrice = difference / actualPrice;
    return actualDiscountPrice * 100;
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
    } else {
      setQuantity(quantity + 1);
    }
  };

  const handleCalculateTotal = (products: GuestCartLine[]) => {
    const total = products.reduce((prev, curr) => {
      prev += (curr.productPrice as number) * curr.qty;
      return prev;
    }, 0);
    dispatch(setGuestCartTotal({ data: total }));
  };

  const getProductQuantities = (products: (CartLine | GuestCartLine)[]) => {
    return Object.entries(
      products?.reduce((quantities, product) => {
        const existingQty = quantities[product.product_id] || 0;
        return {
          ...quantities,
          [product.product_id]: existingQty + product.qty,
        };
      }, {} as Record<string, number>),
    ).map(([productId, qty]) => ({
      product_id: parseInt(productId),
      qty,
    }));
  };

  const handleAddToCart = async () => {
    let productQuantity = cart?.isGuest
      ? getProductQuantities(cart?.guestCart)
      : getProductQuantities(cart?.cartProducts);
    const isExisting = cart.guestCart.find(
      (cartProduct) =>
        cartProduct?.product_id == product?.id &&
        cartProduct?.product_variant_id == selectVariant?.id,
    );
    const productQty = productQuantity?.find(
      (prdct) => prdct?.product_id == product?.id,
    )?.qty;
    const cartProductQty = cart.cartProducts.find(
      (prdct) =>
        prdct?.product_id == product?.id &&
        selectVariant?.id == prdct?.product_variant_id,
    );
    const totalQty = productQty ? productQty + quantity : quantity;
    if (Number(product?.is_unlimited_stock) == 0 && (selectVariant?.stock as number) <= 0) {
      toast.error(t("out_of_stock_message"));
      return;
    }
    if (cart?.isGuest) {
      if (totalQty > (product?.total_allowed_quantity as number)) {
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
            product_id: product?.id,
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
      const isInclude = productQuantity.some(
        (item) => item.product_id === product?.id,
      );

      try {
        if (totalQty > (product?.total_allowed_quantity as number)) {
          toast.error(t("max_cart_limit_error"));
        } else if (
          !isInclude &&
          cart?.cartProducts?.length >= (setting?.setting?.max_cart_items_count as number)
        ) {
          toast.error(t("maximum_cart_quantity_reach"));
        } else {
          const response = await api.addToCart({
            product_id: product?.id,
            product_variant_id: selectVariant.id,
            qty: cartProductQty ? cartProductQty.qty + quantity : quantity,
          });
          if (response.status == 1) {
            if (cartProductQty) {
              const updatedProducts = cart.cartProducts.map((cartProduct) => {
                if (
                  cartProduct.product_id == product?.id &&
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
                  product_id: product?.id,
                  product_variant_id: selectVariant?.id,
                  qty: quantity,
                },
              ];
              dispatch(setCartProducts({ data: productData }));
            }
            dispatch(setCart({ data: response }));
            dispatch(setCartSubTotal({ data: response.sub_total }));
            toast.success(t("product_added_successfully"));
          } else if (response?.message == "opps_stock_is_not_available") {
            toast.error(t("out_of_stock_message"));
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
              (prdctId) => prdctId != product?.id,
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

  // Shareable URL carries the module slug so the recipient opens it in the right module
  const shareModuleSlug =
    urlModuleSlug ??
    slugFromModuleId(modules, product?.module_id ?? activeModuleId);
  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${decodeURI(pathname)}${
    shareModuleSlug ? `?module=${shareModuleSlug}` : ""
  }${language?.code ? `${shareModuleSlug ? "&" : "?"}lang=${language.code}` : ""}`;

  const handleCopyToClipboard = () => {
    if (copyCooldownRef.current) return;
    copyCooldownRef.current = true;
    navigator.clipboard.writeText(shareUrl);
    toast.success(t("link_copied_to_clipboard"));
    setTimeout(() => {
      copyCooldownRef.current = false;
    }, 3000); // 3s cooldown
  };

  const handleProductListNavigation = (sellerId: Id) => {
    dispatch(clearAllFilter());
    router.push(`/products`);
    dispatch(setFilterBySeller({ data: sellerId }));
  };

  // API sends null / missing / "" for no licence; hide the whole FSSAI block then.
  const hasFssai = String(product?.fssai_lic_no ?? "").trim() !== "";

  return (
    <section>
      {queryLoading ? (
        <div className="h-[100vh]">
          <ProductDetailSkeleton />
        </div>
      ) : productNotAvailable == true ? (
        <div className="h-full w-full flex flex-col items-center my-4">
          <ImageWithPlaceholder
            src={ProductNotFoundImage}
            alt={"not product found"}
            width={400}
            height={400}
            loading="lazy"
            fetchPriority="low"
          />
          <p className="text-3xl font-bold w-1/3 text-center text-[var(--foreground-primary)]">
            {t("oops")} {t("product_is_either_unavailable_or_does_not_exist")}
          </p>
          <LocalizedLink
            href={"/"}
            className="px-4 py-2 rounded-lg font-medium bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] text-[var(--button-primary-foreground-default)] transition-colors"
          >
            {t("go_back")}
          </LocalizedLink>
        </div>
      ) : (
        <>
          <BreadCrumb title={product?.translations?.name} />
          <div className="container px-2 mb-6">
            <div className="mt-1">
              <div className="flex flex-col justify-center">
                <div className="grid  grid-cols-1 md:grid-cols-12 mt-2 gap-4 items-start  ">
                  <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
                    {/* No overflow-hidden here: react-image-magnify renders the
                        enlarged panel as an absolutely-positioned sibling at
                        left:100%, so clipping any ancestor hides the zoom. The
                        rounded look comes from the image itself instead. */}
                    <div className="relative aspect-square h-auto w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl">
                      {isMobileScreen ? (
                        <ImageWithPlaceholder
                          src={selectedImage}
                          alt={product?.name}
                          width={430}
                          height={430}
                          className="h-full w-full aspect-square rounded-sm object-contain"
                        />
                      ) : (
                        <ProductZoomImage image={selectedImage} />
                      )}
                      {selectVariant?.discounted_price !== 0 &&
                      selectVariant?.discounted_price !==
                        selectVariant?.price ? (
                        <span className="bg-[var(--status-error-default)] rounded-full text-[var(--status-error-on-status)] text-sm font-normal left-3 leading-5 py-1 px-2 absolute text-center uppercase top-3">
                          {Math.round(
                            calculateDiscount(
                              selectVariant?.discounted_price as number,
                              selectVariant?.price as number,
                            ),
                          )}
                          % {t("off")}
                        </span>
                      ) : null}
                    </div>
                    <div
                      dir={language?.type}
                      className={`${
                        language?.type == "RTL" ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Swiper
                        spaceBetween={10}
                        modules={[Navigation]}
                        className="brand-swiper"
                        breakpoints={{
                          1200: {
                            slidesPerView: 3.5,
                          },
                          1024: {
                            slidesPerView: 3,
                          },
                          768: {
                            slidesPerView: 3,
                          },
                          375: {
                            slidesPerView: 3,
                          },
                          0: {
                            slidesPerView: 2.5,
                          },
                        }}
                      >
                        {productImages?.map((image, index) => (
                          <SwiperSlide key={index}>
                            <div
                              className={`h-auto relative w-full aspect-square p-1 bg-[var(--surface-subtle)] rounded-2xl overflow-hidden cursor-pointer outline outline-1 -outline-offset-1 ${
                                selectedImage === image
                                  ? "outline-[var(--border-default)]"
                                  : "outline-transparent"
                              }`}
                              key={index}
                            >
                              <ImageWithPlaceholder
                                src={image}
                                alt={product?.name}
                                height={600}
                                width={600}
                                className="h-full w-full aspect-square rounded-lg object-contain"
                                handleOnClick={() =>
                                  handleChangeCoverImage(image)
                                }
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-8 flex flex-col gap-6">
                    <div className="pb-4 border-b border-[var(--border-subtle)] flex flex-col justify-center gap-2">
                      <h2 className="text-2xl font-semibold leading-8 text-[var(--foreground-primary)] break-words">
                        {product?.translations?.name}
                      </h2>

                      <div className="flex gap-4 items-center flex-wrap">
                        {(ratingData?.average_rating as number) > 0 &&
                        product?.product_rating == true ? (
                          <div className="flex gap-1 items-center">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const roundedRating =
                                  Math.round((ratingData?.average_rating as number) * 2) / 2;

                                if (star <= Math.floor(roundedRating)) {
                                  return (
                                    <FaStar
                                      key={star}
                                      size={14}
                                      className="fill-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)]"
                                    />
                                  );
                                } else if (
                                  star === Math.floor(roundedRating) + 1 &&
                                  roundedRating % 1 === 0.5
                                ) {
                                  return (
                                    <FaStarHalfAlt
                                      key={star}
                                      size={14}
                                      className="fill-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)]"
                                    />
                                  );
                                } else {
                                  return (
                                    <FaStar
                                      key={star}
                                      size={14}
                                      className="fill-[var(--foreground-placeholder)] text-[var(--foreground-placeholder)]"
                                    />
                                  );
                                }
                              })}
                            </div>
                            <span className="opacity-70 text-[var(--foreground-primary)] text-sm font-normal leading-5">
                              {`(${ratingData?.average_rating}) ${ratingData?.rating_list?.length}`}
                            </span>
                          </div>
                        ) : null}

                        {product?.seller_name !== null && (
                          <>
                            <span className="w-px h-4 bg-[var(--border-default)]" />
                            <div className="flex gap-1 items-center">
                              <span className="text-[var(--foreground-primary)] text-sm font-normal leading-5">
                                {t("seller")} :
                              </span>
                              <span
                                className="text-[var(--foreground-primary)] text-sm font-semibold leading-5 cursor-pointer"
                                onClick={() =>
                                  handleProductListNavigation(product?.seller_id as Id)
                                }
                              >
                                {product?.seller?.translations?.name}
                              </span>
                            </div>
                          </>
                        )}

                        {hasFssai && (
                          <span className="w-px h-4 bg-[var(--border-default)] hidden md:block" />
                        )}
                        {hasFssai && (
                          <div className="flex items-center gap-3">
                            <div className="text-xs">
                              {product?.fssai_lic_img && (
                                <Image
                                  width={100}
                                  height={100}
                                  src={product?.fssai_lic_img}
                                  className="w-9 h-9 object-contain"
                                  alt="fssaiImage"
                                />
                              )}
                            </div>
                            <div className="text-xs">
                              {t("fssai_license_no")} {product?.fssai_lic_no}
                            </div>
                          </div>
                        )}
                      </div>
                      {selectVariant?.few_quantity_left == true && (
                        <p className="text-sm text-[var(--status-error-foreground)] font-bold ">
                          {t("few_quantity_left")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectVariant?.discounted_price !== 0 &&
                      selectVariant?.discounted_price !==
                        selectVariant?.price ? (
                        <>
                          <h2 className="text-2xl font-semibold leading-8 text-[var(--brand-foreground-default)]">
                            {currency}
                            {formatPriceDisplay(selectVariant?.discounted_price)}
                          </h2>
                          <h3 className="text-xl font-medium leading-7 text-[var(--foreground-tertiary)] line-through">
                            {currency}
                            {formatPriceDisplay(selectVariant?.price)}
                          </h3>
                        </>
                      ) : (
                        <>
                          {" "}
                          <h2 className="text-2xl font-semibold leading-8 text-[var(--brand-foreground-default)]">
                            {currency}
                            {formatPriceDisplay(selectVariant?.price)}
                          </h2>
                        </>
                      )}
                    </div>
                    {/* <div dangerouslySetInnerHTML={{ __html: product?.description }}>
                                    </div> */}
                    {foodFlow.isFoodModule ? null : isMultiAttribute ? (
                      <div className="flex flex-col gap-6">
                        {attributes?.map((attribute) => (
                          <div className="flex flex-col gap-1" key={attribute.id}>
                            <p className="text-sm font-medium leading-5 text-[var(--foreground-primary)] capitalize">
                              {t("select")} {attribute?.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              {attribute?.values?.map((attrValue) => {
                                const isSelected =
                                  selectedAttrs?.[attribute.id] == attrValue.id;
                                const isAvailable = isValueAvailable(
                                  attribute.id,
                                  attrValue.id,
                                );
                                const stateClass = isSelected
                                  ? "outline-[var(--brand-border-default)]"
                                  : isAvailable
                                    ? "bg-[var(--surface-default)] outline-[var(--border-subtle)]"
                                    : "bg-[var(--surface-default)] outline-[var(--border-subtle)] opacity-40 cursor-not-allowed pointer-events-none";
                                const onSelect = () =>
                                  isAvailable &&
                                  handleSelectAttribute(
                                    attribute.id,
                                    attrValue.id,
                                  );
                                if (attribute?.type == "color") {
                                  return (
                                    <div
                                      key={attrValue.id}
                                      title={attrValue?.value as string}
                                      className={`inline-flex flex-col justify-start items-center gap-1.5 px-3 pt-3 pb-2 rounded-xl cursor-pointer outline outline-1 -outline-offset-1 ${stateClass}`}
                                      onClick={onSelect}
                                    >
                                      <span
                                        className="block h-6 w-6 rounded-full border border-[var(--surface-subtle)]"
                                        style={{
                                          backgroundColor:
                                            attrValue?.color_code || "var(--surface-disabled)",
                                        }}
                                      ></span>
                                      <p className="text-base font-normal leading-6 text-[var(--foreground-primary)] capitalize line-clamp-1">
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
                                    <div
                                      key={attrValue.id}
                                      title={attrValue?.value as string}
                                      className={`flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer outline outline-1 -outline-offset-1 w-[100px] p-2 ${stateClass}`}
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
                                      <p className="text-base font-normal leading-6 text-[var(--foreground-primary)] capitalize line-clamp-1">
                                        {attrValue?.value}
                                      </p>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={attrValue.id}
                                    className={`inline-flex flex-col justify-center items-center min-w-10 min-h-10 px-3 py-2 rounded-lg cursor-pointer outline outline-1 -outline-offset-1 ${
                                      isSelected
                                        ? "bg-[var(--brand-background-subtle)] outline-[var(--brand-border-default)]"
                                        : isAvailable
                                          ? "bg-[var(--surface-subtle)] outline-[var(--border-subtle)]"
                                          : "bg-[var(--surface-subtle)] outline-[var(--border-subtle)] opacity-40 cursor-not-allowed pointer-events-none"
                                    }`}
                                    onClick={onSelect}
                                  >
                                    <p className="text-base font-normal leading-6 text-[var(--foreground-primary)]">
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
                      <div className="flex flex-col">
                        <p className="text-sm font-medium leading-5 text-[var(--foreground-primary)]">
                          {t("chooseVariant")}
                        </p>
                        <div className=" grid grid-cols-12">
                          {/* Buyable first, API order kept inside each group (§5.2). */}
                          {buyableFirst(product?.variants, product?.is_unlimited_stock).map((variant) => {
                            const discountPrice = variant?.discounted_price;
                            const price = variant?.price;
                            return (
                              <div
                                className={`flex flex-col md:col-span-4 lg:col-span-3 col-span-6 mx-1 my-1 text-center rounded-lg justify-center items-center cursor-pointer p-2 gap-1 text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 ${
                                  selectVariant?.id == variant?.id
                                    ? "bg-[var(--brand-background-subtle)] outline-[var(--brand-border-default)]"
                                    : "bg-[var(--surface-subtle)] outline-[var(--border-subtle)]"
                                }`}
                                key={variant.id}
                                onClick={() => handleChangeVariant(variant)}
                              >
                                <p className="font-bold text-sm">
                                  {getVariantLabel(variant)}
                                </p>
                                <span className="flex gap-1 text-[13px] line-clamp-1 font-semibold">
                                  <p>
                                    {currency}
                                    {formatPriceDisplay(
                                      discountPrice != 0 && discountPrice !== price
                                        ? discountPrice
                                        : price
                                    )}
                                  </p>
                                  {discountPrice != 0 &&
                                  discountPrice !== price ? (
                                    <p className="line-through">
                                      {currency}
                                      {formatPriceDisplay(price)}
                                    </p>
                                  ) : (
                                    <></>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-4 flex-col lg:flex-row ">
                      {isVariantAvailable ? (
                        foodFlow.isFoodModule ? (
                          foodCartQty > 0 ? (
                            <div className="flex rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] bg-[var(--surface-subtle)] p-1 lg:py-[8px] items-center w-[120px]">
                              <button
                                disabled={foodFlow.loading}
                                className="font-bold text-xl text-[var(--foreground-primary)] disabled:opacity-60"
                                onClick={() => foodFlow.decrementLatestLine()}
                              >
                                <FiMinus />
                              </button>
                              <input
                                type="text"
                                disabled
                                value={foodCartQty}
                                className="text-center font-medium text-base leading-6 bg-transparent text-[var(--foreground-primary)] w-[70px]"
                              />
                              <button
                                disabled={foodFlow.loading}
                                className="font-bold text-xl text-[var(--foreground-primary)] disabled:opacity-60"
                                onClick={() => foodFlow.openFlow({ increase: true })}
                              >
                                <FiPlus />
                              </button>
                            </div>
                          ) : (
                          <div>
                            <button
                              disabled={foodFlow.loading}
                              className="flex gap-2 items-center justify-center px-4 py-2 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)] text-base font-medium leading-6 text-nowrap transition-colors disabled:opacity-60"
                              onClick={() => foodFlow.openFlow()}
                            >
                              <FaShoppingBasket size={22} />
                              {t("add_to_cart")}
                            </button>
                          </div>
                          )
                        ) : (
                        <div className="flex gap-4 items-center ">
                          <div className="flex rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] bg-[var(--surface-subtle)] p-1 lg:py-[8px] items-center w-[120px]">
                            <button
                              className="font-bold text-xl text-[var(--foreground-primary)]"
                              onClick={handleDecreaseQuantity}
                            >
                              <FiMinus />
                            </button>
                            <input
                              type="text"
                              disabled
                              value={quantity}
                              className="text-center font-medium text-base leading-6 bg-transparent text-[var(--foreground-primary)] w-[70px]"
                            />
                            <button
                              className="font-bold text-xl text-[var(--foreground-primary)]"
                              onClick={handleIncreseQuantity}
                            >
                              <FiPlus />
                            </button>
                          </div>
                          <div>
                            <button
                              className="flex gap-2 items-center justify-center px-4 py-2 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)] text-base font-medium leading-6 text-nowrap transition-colors"
                              onClick={handleAddToCart}
                            >
                              <FaShoppingBasket size={22} />
                              {t("add_to_cart")}
                            </button>
                          </div>
                        </div>
                        )
                      ) : (
                        <div className="flex items-center h-[80px] md:h-[38px] text-[var(--status-error-foreground)] font-extrabold ">
                          {t("OutOfStock")}
                        </div>
                      )}

                      <div className="flex gap-2 items-center">
                        <span
                          className="p-3 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--foreground-tertiary)] flex justify-center items-center cursor-pointer"
                          onClick={handleProductLikes}
                        >
                          {favoriteProducts &&
                          favoriteProducts?.includes(product?.id) ? (
                            <BiSolidHeart size={24} className="fill-[var(--brand-background-default)]" />
                          ) : (
                            <BiHeart size={24} className="text-[var(--foreground-tertiary)]" />
                          )}
                        </span>
                        <span className="opacity-75 text-center text-[var(--foreground-primary)] text-base font-normal leading-6">
                          {" "}
                          {favoriteProducts &&
                          favoriteProducts?.includes(product?.id)
                            ? t("removeTowishlist")
                            : t("addToWishlist")}
                        </span>
                      </div>
                    </div>
                    <div className="bg-[var(--surface-subtle)] rounded-2xl p-4 flex flex-col gap-4">
                      {product?.indicator ? (
                        product?.indicator == 1 ? (
                          <div className="flex gap-3 items-center">
                            <div className="size-10 shrink-0 relative object-cover">
                              <Image
                                src={VegIcon}
                                fill
                                alt={product?.name as string}
                                className="h-full w-full "
                              />
                            </div>
                            <p className="text-base font-medium leading-6 text-[var(--foreground-primary)]">{t("vegetarian")}</p>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-center">
                            <div className="size-10 shrink-0 relative object-cover">
                              <Image
                                src={NonVegIcon}
                                fill
                                alt={product?.name as string}
                                className="h-full w-full "
                              />
                            </div>
                            <p className="text-base font-medium leading-6 text-[var(--foreground-primary)]">{t("non-vegetarian")}</p>
                          </div>
                        )
                      ) : null}
                      {product?.cancelable_status == 1 ? (
                        <div className="flex items-center  gap-2">
                          <div className="size-10 shrink-0 text-[var(--brand-foreground-default)]">
                            <CancelableIcon className="h-full w-full" />
                          </div>
                          <span className="cancelDetail text-base font-medium leading-6 text-[var(--foreground-primary)]">
                            {t("cancelable")}
                            {product?.till_status == 1 ? (
                              <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                                {t("payment_pending")}
                              </p>
                            ) : null}
                            {product?.till_status == 2 ? (
                              <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                                {t("received")}
                              </p>
                            ) : null}
                            {product?.till_status == 3 ? (
                              <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                                {t("processed")}
                              </p>
                            ) : null}
                            {product?.till_status == 4 ? (
                              <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                                {t("shipped")}
                              </p>
                            ) : null}
                            {product?.till_status == 5 ? (
                              <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                                {t("out_for_delivery")}
                              </p>
                            ) : null}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="size-10 shrink-0 text-[var(--brand-foreground-default)]">
                            <NotCancelableIcon className="h-full w-full" />
                          </div>
                          <span className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                            {t("non-cancelable")}
                          </span>
                        </div>
                      )}

                      {product?.return_status == 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="size-10 shrink-0 text-[var(--brand-foreground-default)]">
                            <ReturnableIcon className="h-full w-full" />
                          </div>
                          <span className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                            {t("returnable")} {product?.return_days} {product?.return_days === 1 ? t("day") : t("days")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="size-10 shrink-0 text-[var(--brand-foreground-default)]">
                            <NotReturnableIcon className="h-full w-full" />
                          </div>
                          <span className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                            {t("non-returnable")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 items-center my-2 md:my-0">
                      <span className="text-sm font-normal leading-5 text-[var(--foreground-primary)]">
                        {t("shareProduct")}:
                      </span>
                      <div className="flex gap-3">
                        <WhatsappShareButton
                          url={shareUrl}
                        >
                          <WhatsappIcon className="h-8 w-8 rounded-full" />
                        </WhatsappShareButton>
                        <TwitterShareButton
                          url={shareUrl}
                        >
                          <TwitterIcon className="h-8 w-8 rounded-full" />
                        </TwitterShareButton>
                        <FacebookShareButton
                          url={shareUrl}
                        >
                          <FacebookIcon className="h-8 w-8 rounded-full" />
                        </FacebookShareButton>
                        <FaLink
                          className="h-8 w-8 rounded-full bg-[var(--foreground-tertiary)] text-[var(--foreground-inverse)] p-2 hover:cursor-pointer"
                          onClick={handleCopyToClipboard}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ProductDescription product={product} ratingData={ratingData} />
          </div>
          <RecentalyViewedProducts
            recentalyViewedProducts={recentlyVisitedProduct}
          />
          {product?.tag_names && (
            <SimilarProducts slug={slug} tag_names={product?.tag_names} />
          )}
        </>
      )}
      <SingleSellerConfirmationModal
        showSingleSellerModal={showSingleSellerModal}
        setSingleSellerModal={setSingleSellerModal}
        product={product}
        selectedVariant={selectVariant}
      />
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
    </section>
  );
};

export default ProductDetail;
