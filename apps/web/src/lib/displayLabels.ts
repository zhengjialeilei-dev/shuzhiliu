import { TOOL_CATEGORY } from './resourceCategories';

export function formatCategoryLabel(category: string) {
  return category === TOOL_CATEGORY ? '实用工具' : category;
}
