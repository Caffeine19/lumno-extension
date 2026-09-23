const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const searchUtilsSource = readSource('src/shared/search-utils.js');
const overlaySource = readSource('src/overlay/search-panel.js');
const suggestionsReactSource = readSource('react-src/newtab/suggestions.tsx');
const actionModelSource = readSource('src/shared/suggestion-action-model.js');

// --- shared token table and parsing exports ---

assert.match(
  searchUtilsSource,
  /\{ token: ["']@fav["'], sourceType: ["']bookmark["'] \}[\s\S]*?\{ token: ["']@his["'], sourceType: ["']history["'] \}/,
  'the scope token table should map @fav to bookmarks and @his to history'
);
assert.match(
  searchUtilsSource,
  /parseSearchScopeTokenInput,[\s\S]*?getSearchScopeTokenCandidates,[\s\S]*?applySearchScopeTokenCompletion,[\s\S]*?canonicalizeSearchScopeTokenInput,/,
  'shared search utils should export the scope token parsing helpers'
);
assert.match(
  searchUtilsSource,
  /function parseSearchScopeTokenInput\(rawInput\) \{[\s\S]*?\bpending\b/,
  'the parser should resolve pending completion fragments'
);

// --- shared parsing behaviour ---

const searchUtils = require('../src/shared/search-utils.js');
assert.strictEqual(
  searchUtils.canonicalizeSearchScopeTokenInput('@fav @his').value,
  '@his ',
  'inline scope tokens should be mutually exclusive (last one wins)'
);
assert.strictEqual(
  searchUtils.applySearchScopeTokenCompletion('@fav @h', '@his'),
  '@his ',
  'completing a replacement token should drop the previous token'
);
assert.strictEqual(
  searchUtils.parseSearchScopeTokenInput('xx@foo.com').sourceType,
  '',
  'email-like input must never activate a scope token'
);
assert.strictEqual(
  searchUtils.parseSearchScopeTokenInput('@fav lum @h').pending,
  null,
  'mid-query @-fragments must not open token completion'
);

// --- overlay wiring ---

assert.match(
  overlaySource,
  /function parseScopeTokenFromValue\(rawValue\) \{[\s\S]*?SEARCH_UTILS\.parseSearchScopeTokenInput\(rawValue\)/,
  'the overlay should resolve scope tokens through the shared parser'
);
assert.match(
  overlaySource,
  /function syncSearchTriggerHintFromInput\(rawValue\) \{[\s\S]*?triggerScopeParse\.pending \|\|\s*triggerScopeParse\.sourceType\) \{[\s\S]*?clearPendingSearchTriggerHint\(\)/,
  'typing a scope token should suppress trigger-word Tab hints'
);
assert.match(
  overlaySource,
  /const requestLookupQuery = requestScopeToken\s*\? String\(requestScopeToken\.query \|\| ''\)\.trim\(\)\s*: requestQuery;/,
  'the overlay should strip the inline token before the lookup query reaches the browser APIs'
);
assert.match(
  overlaySource,
  /query: requestLookupQuery,/,
  'the background lookup should receive the stripped query'
);
assert.match(
  overlaySource,
  /const requestLocalSearchScope = localSearchScopeState \|\|\s*\(requestScopeToken \? \{ sourceType: requestScopeToken\.sourceType \} : null\);/,
  'scope tokens should reuse the scoped lookup contract (sourceTypes + no open tabs)'
);
assert.match(
  overlaySource,
  /if \(requestLocalSearchScope\) \{\s*remoteMixState\.settled = true;/,
  'token-scoped lookups should skip remote engine suggestions'
);
assert.match(
  overlaySource,
  /\} else if \(scopeTokenTyping\) \{\s*preSuggestions\.push\(\.\.\.getScopeTokenCandidateSuggestions\(/,
  'typing an incomplete token should surface completion candidates above the results'
);
assert.match(
  overlaySource,
  /function getScopeTokenCandidateSuggestions\(rawValue\) \{[\s\S]*?SEARCH_UTILS\.getSearchScopeTokenCandidates\(rawValue, \{\s*enabledSourceTypes: enabledSearchResultSourceTypes\s*\}\)/,
  'completion candidates should respect the enabled search result source types'
);
assert.match(
  overlaySource,
  /function buildScopeTokenSuggestion\(candidate\) \{[\s\S]*?type: 'scopeToken',[\s\S]*?commandText:[\s\S]*?tokenText:/,
  'candidate rows should carry the scopeToken type and their token text'
);
assert.match(
  overlaySource,
  /function activateRenderedOverlaySuggestion\(suggestion, query, event, index, item\) \{[\s\S]*?suggestion\.type === 'scopeToken'[\s\S]*?applyScopeTokenFromSuggestion\(suggestion\)/,
  'clicking a candidate row should apply its scope token'
);
assert.match(
  overlaySource,
  /const selectedSuggestion = currentSuggestions\[activeSuggestionIndex\];\s*if \(selectedSuggestion\.type === 'scopeToken'\) \{\s*applyScopeTokenFromSuggestion\(selectedSuggestion\);/,
  'Enter on a candidate row should apply its scope token'
);
assert.match(
  overlaySource,
  /function applyScopeTokenFromSuggestion\(suggestion\) \{[\s\S]*?SEARCH_UTILS\.applySearchScopeTokenCompletion\(rawValue, tokenText\)/,
  'applying a candidate should go through the shared completion helper'
);
assert.match(
  overlaySource,
  /function canonicalizeScopeTokenInput\(rawValue\) \{[\s\S]*?SEARCH_UTILS\.canonicalizeSearchScopeTokenInput\(rawValue\)/,
  'the overlay should canonicalize duplicate tokens through the shared helper'
);
assert.match(
  overlaySource,
  /const scopeCanonicalValue = canonicalizeScopeTokenInput\(rawValue\);/,
  'input handling should canonicalize mutually exclusive tokens as they are typed'
);
assert.ok(
  (overlaySource.match(/handleScopeTokenRouting\(rawValue, query\)/g) || []).length >= 2,
  'both the IME composition and plain input paths should route scope tokens'
);
assert.match(
  overlaySource,
  /function handleScopeTokenRouting\(rawValue, trimmedQuery\) \{[\s\S]*?dismissScopeModesForScopeToken\(\)/,
  'scope tokens should supersede other scope modes instead of stacking with them'
);
assert.match(
  overlaySource,
  /function dismissScopeModesForScopeToken\(\) \{[\s\S]*?openTabsSearchModeActive = false;[\s\S]*?clearSiteSearch\(\);[\s\S]*?clearLocalSearchScope\(\);/,
  'activating a scope token should dismiss the open-tabs, site-search, and local-scope modes'
);
assert.match(
  overlaySource,
  /function tryRemoveScopeTokenUnitOnBackspace\(event\) \{[\s\S]*?searchInput\.selectionStart !== searchInput\.selectionEnd/,
  'Backspace unit removal should keep normal behaviour for text selections'
);
assert.match(
  overlaySource,
  /if \(isImeCompositionEvent\(e\)\) \{\s*return;\s*\}\s*if \(e\.key === 'Backspace' && tryRemoveScopeTokenUnitOnBackspace\(e\)\)/,
  'the token unit Backspace must stay inert while an IME composition is active'
);
assert.match(
  overlaySource,
  /e\.key === 'Escape' && isScopeTokenModeSuperseding\(\)\) \{[\s\S]*?clearScopeTokenFromInput\(\)/,
  'Escape should drop the inline token and restore the unrestricted query'
);
assert.match(
  overlaySource,
  /const scopedSourceTypeFilter = localSearchQueryModeActive && localSearchScopeState/,
  'token-scoped results should filter through the same source-type gate as the scope label mode'
);
assert.match(
  overlaySource,
  /!scopeTokenTyping && !scopeTokenQueryModeActive\)\s*\? getInlineSiteSearchCandidate/,
  'inline site-search rows should be suppressed while a scope token is active'
);
assert.match(
  overlaySource,
  /scopeTokenEmptyHint[\s\S]*?formatMessage\('local_search_tab_hint', '限定\{source\}'/,
  'an active token without a query should reuse the localized scope hint copy'
);
assert.match(
  overlaySource,
  /localSearchQueryModeActive && allSuggestions\.length === 0[\s\S]*?t\('overlay_empty_result', '无匹配结果'\)[\s\S]*?reactView\.render\(\{[\s\S]*?emptyMessage/,
  'the scoped empty state should keep passing a visible empty message to the React suggestions view'
);
assert.match(
  overlaySource,
  /const neutralTypes = \[[^\]]*'commandDocumentPip', 'scopeToken'\];/,
  'scope token rows should use the neutral (non-brand) theme treatment'
);

// --- suggestion rendering and action model ---

assert.match(
  suggestionsReactSource,
  /if \(type === 'scopeToken'\) \{[\s\S]*?ri-history-line[\s\S]*?ri-bookmark-3-line/,
  'candidate rows should render scope-specific remix icons'
);
assert.match(
  actionModelSource,
  /const COMMAND_SUGGESTION_TYPES = new Set\(\[[\s\S]*?'scopeToken'[\s\S]*?\]\);/,
  'scope token rows should behave like command rows in the action model'
);
const actionModel = require('../src/shared/suggestion-action-model.js');
assert.strictEqual(
  actionModel.getVisitButtonAction({ type: 'scopeToken' }),
  null,
  'scope token rows must not expose a visit button'
);

// --- localization reuse ---

['en', 'ja', 'zh_CN', 'zh_TW'].forEach((locale) => {
  const messages = readSource(`_locales/${locale}/messages.json`);
  assert.ok(
    messages.includes('"local_search_tab_hint"'),
    `${locale} should keep the reused scope hint copy`
  );
  assert.ok(
    messages.includes('"search_tag_bookmark"') && messages.includes('"search_tag_history"'),
    `${locale} should keep the reused bookmark/history labels`
  );
});

console.log('scope token tests passed');
