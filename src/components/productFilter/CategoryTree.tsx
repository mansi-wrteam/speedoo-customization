import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus } from "lucide-react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { Id } from "@/types/common";
import type { Category } from "@/types/models/catalog";
import type { ProductFilterState } from "@/types/state";

/** One node of the filter tree built from a category and its `cat_active_childs`. */
interface CategoryTreeNode {
  title: string | null | undefined;
  key: Id;
  children: CategoryTreeNode[];
}

export interface CategoryTreeProps {
  categories: Category[] | null;
  selectedCategories: Id[];
  onCategoryChange: (categories: Id[]) => void;
  /** The ProductFilter slice; `category_id` seeds the selection. */
  initialFilter: ProductFilterState;
}

interface TreeNodeProps {
  node: CategoryTreeNode;
}

const CategoryTree = ({
  categories,
  selectedCategories,
  onCategoryChange,
  initialFilter,
}: CategoryTreeProps) => {
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Id[]>([]);

  // Transform categories into tree structure
  // Only called with a non-empty list, so `?.map` always yields an array.
  const transformCategoryData = (categories: Category[] | null | undefined): CategoryTreeNode[] => {
    return categories?.map((category) => ({
      title: category?.translations?.name ?? category?.name,
      key: category.id,
      children:
        (category.cat_active_childs?.length as number) > 0
          ? transformCategoryData(category.cat_active_childs)
          : [],
    })) as CategoryTreeNode[];
  };

  // Initialize tree data when categories change
  useEffect(() => {
    if ((categories?.length as number) > 0) {
      const transformedData = transformCategoryData(categories);
      setTreeData(transformedData);
    }
  }, [categories]);

  // Initialize selected categories from filter
  useEffect(() => {
    if (initialFilter?.category_id) {
      // Usually a string (comma-joined ids / slug), but a numeric id is allowed
      // too (CategoryFlowBreadcrumb stores one), so split its string form.
      const categories = String(initialFilter.category_id).split(",");
      const catNum = categories
        .filter((cat) => cat !== "")
        .map((cat) => parseInt(cat));
      onCategoryChange(catNum);
    }
  }, [initialFilter]);

  const handleExpandCollapse = (nodeKey: Id) => {
    setExpandedKeys((prev) =>
      prev.includes(nodeKey)
        ? prev.filter((key) => key !== nodeKey)
        : [...prev, nodeKey]
    );
  };

  const handleCheck = (checked: CheckedState, nodeKey: Id, allChildKeys: Id[]) => {
    let newSelected = [...selectedCategories];

    // Helper function to check if all children of a node are selected
    const areAllChildrenSelected = (node: CategoryTreeNode) => {
      if (!node.children?.length) return true;
      return node.children.every((child) => newSelected.includes(child.key));
    };

    // Helper function to add parent nodes when all children are selected
    const addParentIfAllChildrenSelected = (nodes: CategoryTreeNode[], childKey: Id) => {
      for (let node of nodes) {
        if (node.children?.some((child) => child.key === childKey)) {
          if (areAllChildrenSelected(node)) {
            newSelected.push(node.key);
            addParentIfAllChildrenSelected(treeData, node.key);
          }
        }
        if (node.children?.length > 0) {
          addParentIfAllChildrenSelected(node.children, childKey);
        }
      }
    };

    if (checked) {
      // Add current node and all its children
      newSelected = [...newSelected, nodeKey];

      // Check and add parents if all siblings are selected
      // addParentIfAllChildrenSelected(treeData, nodeKey);
    } else {
      // Remove current node and all its children
      newSelected = newSelected.filter(
        (key) => key !== nodeKey 
      );

      // Find and remove parent nodes recursively
      // const findAndRemoveParents = (nodes, childKey) => {
      //   for (let node of nodes) {
      //     if (node.children?.some((child) => child.key === childKey)) {
      //       // Check if all children are unchecked
      //       const allChildrenUnchecked = node.children.every(
      //         (child) => !newSelected.includes(child.key)
      //       );

      //       if (allChildrenUnchecked) {
      //         // Remove the parent node
      //         newSelected = newSelected.filter((key) => key !== node.key);
      //         // Recursively check this node's parent
      //         findAndRemoveParents(treeData, node.key);
      //       }
      //     }
      //     if (node.children?.length > 0) {
      //       findAndRemoveParents(node.children, childKey);
      //     }
      //   }
      // };

      // findAndRemoveParents(treeData, nodeKey);
    }

    // Remove duplicates
    newSelected = [...new Set(newSelected)];
    onCategoryChange(newSelected);
  };

  // Get all child keys for a node
  const getAllChildKeys = (node: CategoryTreeNode): Id[] => {
    let keys: Id[] = [];
    if (node.children?.length > 0) {
      node.children.forEach((child) => {
        keys.push(child.key);
        keys = [...keys, ...getAllChildKeys(child)];
      });
    }
    return keys;
  };

  // Recursive component to render tree nodes
  const TreeNode = ({ node }: TreeNodeProps) => {
    const isExpanded = expandedKeys.includes(node.key);
    const hasChildren = node.children?.length > 0;
    const isChecked = selectedCategories.includes(node.key);
    const childKeys = getAllChildKeys(node);

    return (
      <div className="ml-1 md:ml-1.5 lg:ml-2">
        <div className="flex justify-between items-center my-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleCheck(!isChecked, node.key, childKeys)}>
            <Checkbox
              className="shadow-sm"
              checked={isChecked}
              onCheckedChange={(checked) =>
                handleCheck(checked, node.key, childKeys)
              }
            />
            <span className="text-sm font-normal text-ellipsis text-[var(--foreground-primary)]" >
              {node.title}
            </span>
          </div>
          {hasChildren && (
            <button
              onClick={() => handleExpandCollapse(node.key)}
              className="p-1 hover:bg-[var(--surface-hover)] rounded-full text-[var(--foreground-primary)]"
            >
              {isExpanded ? (
                <Minus className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-1">
            {node.children.map((child) => (
              <TreeNode key={child.key} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-y-auto px-2 pb-4 md:px-2 lg:px-4">
      {treeData.map((node) => (
        <TreeNode key={node.key} node={node} />
      ))}
    </div>
  );
};

export default CategoryTree;
