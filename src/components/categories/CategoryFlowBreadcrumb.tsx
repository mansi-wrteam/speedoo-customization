import { useDispatch, useSelector } from "react-redux";
import { useLocalizedRouter } from "@/utils/localizedNav";
import {
  setListingSource,
  setFilterCategory,
  setCategorySlug,
  setCategoryBreadcrumb,
} from "@/redux/slices/productFilterSlice";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { isRtl } from "@/lib/utils";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { CategoryCrumb, RootState } from "@/types/state";

const CategoryFlowBreadcrumb = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  const rtl = isRtl();
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);

  const categoryBreadcrumb = useSelector(
    (state: RootState) => state.ProductFilter.categoryBreadcrumb,
  );

  if (!categoryBreadcrumb || categoryBreadcrumb.length === 0) return null;

  const handleBreadcrumbClick = (cat: CategoryCrumb, index: number) => {
    const newBreadcrumb = categoryBreadcrumb.slice(0, index + 1);

    dispatch(setListingSource({ data: "category" }));
    dispatch(setFilterCategory({ data: cat.id }));
    dispatch(setCategorySlug({ data: cat.slug }));
    dispatch(setCategoryBreadcrumb({ data: newBreadcrumb }));

    router.push({
    pathname: "/products",
    query: {
      category: cat.slug,
      category_id: cat.id,
      source: "category",
      lang: language?.code
    }
  });
  };

  return (
    <div className="mb-3 mt-3 flex flex-wrap gap-2 text-sm leading-5 text-[var(--foreground-tertiary)]">
      {categoryBreadcrumb.map((cat, index) => (
        <span key={cat.id} className="flex items-center gap-2">
          <button
            onClick={() => handleBreadcrumbClick(cat, index)}
            className="font-medium transition-colors hover:text-[var(--brand-foreground-default)]"
          >
            {cat.name}
          </button>
          {index < categoryBreadcrumb.length - 1 && (
            <span>
              {rtl ? <FaChevronLeft size={14} /> : <FaChevronRight size={14} />}
            </span>
          )}
        </span>
      ))}
    </div>
  );
};

export default CategoryFlowBreadcrumb;
