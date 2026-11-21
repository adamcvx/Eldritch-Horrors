export function createPageUrl(pageName: string) {
  const suffixStart = pageName.search(/[?#]/);
  const path = suffixStart < 0 ? pageName : pageName.slice(0, suffixStart);
  const suffix = suffixStart < 0 ? '' : pageName.slice(suffixStart);
  return '/' + path.toLowerCase().replace(/ /g, '-') + suffix;
}
