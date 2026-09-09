Tags: Release

## Features

- 新增 Kagi 内置搜索引擎，支持通过 `kg` 或 `kagi` 触发搜索，并提供与现有搜索源一致的本地图标和浏览器默认搜索引擎识别。

## Bug Fixes

- 修复搜索范围面板中鼠标悬停会覆盖键盘焦点描边的问题，使用方向键浏览搜索源时始终保留清晰的当前项提示。
- 修复点击搜索源时原生焦点可能先滚动面板祖先的问题，避免指针选择造成搜索面板或页面位置跳动。
- 调整 New Tab 壁纸效果的销毁时机，不再通过 `beforeunload` 提前移除画布，使同页导航期间的已绘制效果保持稳定。

---

## Features

- Added Kagi as a built-in search engine with `kg` and `kagi` triggers, bundled local artwork, and default-browser search engine recognition consistent with the existing providers.

## Bug Fixes

- Fixed pointer hover overriding the keyboard focus border in the search-scope panel, so arrow-key navigation always retains a clear current-item indicator.
- Prevented native pointer focus from scrolling panel ancestors before a search source is selected, avoiding unexpected panel or page movement.
- Adjusted the New Tab wallpaper effect lifecycle so `beforeunload` no longer removes the canvas early, preserving the painted effect during same-tab navigation.
