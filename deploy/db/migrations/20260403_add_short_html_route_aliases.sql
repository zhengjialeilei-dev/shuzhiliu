UPDATE resources
SET route_path = CASE file_path
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/legacy/ai-apps/svg-pie-chart-teaching.html' THEN '/svg'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/huarongdao-three-kingdoms.html' THEN '/hrd'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/three-view-builder.html' THEN '/sst'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/position-explorer.html' THEN '/wz'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/reciprocal-discovery.html' THEN '/ds'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/legacy/ai-apps/negative-numbers-lab.html' THEN '/qzfs'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/geocanvas-pro.html' THEN '/jh'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/interest-calculator.html' THEN '/ll'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/interest-courseware.html' THEN '/llkj'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/decimal-world.html' THEN '/sjs'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/pacman-angle-lab.html' THEN '/jdg'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/cylinder-volume.html' THEN '/yztj'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/cylinder-net-explorer.html' THEN '/yzzk'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/cylinder-surface-area.html' THEN '/yzbm'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/circle-circumference-derivation.html' THEN '/yzc'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/legacy/ai-apps/circle-area-derivation.html' THEN '/ymj'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/legacy/ai-apps/doctor-strange-math.html' THEN '/qybs'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/translation-rotation-lab.html' THEN '/pyxz'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/pie-chart-lab.html' THEN '/sxt'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/discount-mystery.html' THEN '/dz'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/negative-world.html' THEN '/fs'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/solid-of-revolution.html' THEN '/xzt'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/gomoku-fun.html' THEN '/wzq'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/ratio-meaning.html' THEN '/bd'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/discount-traps.html' THEN '/zk'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/percentage-meaning.html' THEN '/bfs'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/painted-cube.html' THEN '/bmts'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/sudoku-fun.html' THEN '/sd'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/cuboid-max-cube.html' THEN '/cftg'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/potion-percentages.html' THEN '/nd'
  WHEN 'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/othello-ai.html' THEN '/hbq'
  ELSE route_path
END
WHERE resource_type = 'html';

SELECT title, route_path
FROM resources
WHERE resource_type = 'html'
ORDER BY route_path, title;
