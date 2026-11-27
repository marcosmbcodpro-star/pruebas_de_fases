export function normalizeCaseCategoryList(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  return [...new Set(raw
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0))];
}

export function caseMatchesCategory(caseEntry, categoryFilter = []) {
  const selected = normalizeCaseCategoryList(categoryFilter);
  if (selected.length === 0) return true;
  const category = String(caseEntry?.category || '').trim();
  return selected.some(filterCategory => (
    filterCategory === '__uncategorized__'
      ? !category
      : category === filterCategory
  ));
}

export function sortCases(list, mode = 'updated-desc') {
  const arr = [...list];
  const statusOrder = { abierto: 0, curso: 1, resuelto: 2 };

  return arr.sort((a, b) => {
    const titleA = String(a.title || '').trim();
    const titleB = String(b.title || '').trim();

    switch (mode || 'updated-desc') {
      case 'updated-asc':
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      case 'name-asc':
        return titleA.localeCompare(titleB, 'es', { sensitivity: 'base' }) || ((b.updatedAt || 0) - (a.updatedAt || 0));
      case 'name-desc':
        return titleB.localeCompare(titleA, 'es', { sensitivity: 'base' }) || ((b.updatedAt || 0) - (a.updatedAt || 0));
      case 'status':
        return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || titleA.localeCompare(titleB, 'es', { sensitivity: 'base' });
      case 'updated-desc':
      default:
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    }
  });
}

export function statusLabel(status) {
  if (status === 'curso') return 'En curso';
  if (status === 'resuelto') return 'Resuelto';
  return 'Abierto';
}
