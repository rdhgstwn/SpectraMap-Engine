// ======================================================================
// GEE APP: SpectraMap-Engine
// ======================================================================

var CFG = {
  startDate: '2025-01-01',
  endDate:   '2025-12-31',
  cloudMax:  20
};

var STATE = {
  roi:            null,
  rawImage:       null,
  composite:      null,
  sData:          null,
  autoMin:        -1,
  autoMax:        1,
  visParams:      { min: -1, max: 1, palette: [] },
  layerName:      'Output_Index',
  selectedPalette:'RdYlGn',
  chartData:      null
};

var SENSORS = {
  'Sentinel-2 SR': {
    col:       'COPERNICUS/S2_SR_HARMONIZED',
    cloud:     'CLOUDY_PIXEL_PERCENTAGE',
    scaleType: 'S2',
    bands:     ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12'],
    map: { B:'B2', G:'B3', R:'B4', RE1:'B5', RE2:'B6', RE3:'B7',
           NIR:'B8', NIR2:'B8A', SWIR1:'B11', SWIR2:'B12' },
    trueColor: ['B4','B3','B2']
  },
  'Landsat 8 SR': {
    col:       'LANDSAT/LC08/C02/T1_L2',
    cloud:     'CLOUD_COVER',
    scaleType: 'L89',
    bands:     ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
    map: { B:'SR_B2', G:'SR_B3', R:'SR_B4', NIR:'SR_B5',
           SWIR1:'SR_B6', SWIR2:'SR_B7' },
    trueColor: ['SR_B4','SR_B3','SR_B2']
  },
  'Landsat 9 SR': {
    col:       'LANDSAT/LC09/C02/T1_L2',
    cloud:     'CLOUD_COVER',
    scaleType: 'L89',
    bands:     ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
    map: { B:'SR_B2', G:'SR_B3', R:'SR_B4', NIR:'SR_B5',
           SWIR1:'SR_B6', SWIR2:'SR_B7' },
    trueColor: ['SR_B4','SR_B3','SR_B2']
  }
};

var INDICES_LOGIC = {
  'NDVI':    { label:'NDVI — Normalized Difference Vegetation Index', eq:'(NIR - R) / (NIR + R)', b1:'NIR', b2:'R', redEdge:false },
  'EVI':     { label:'EVI — Enhanced Vegetation Index', eq:'2.5 * ((NIR - R) / (NIR + 6.0 * R - 7.5 * B + 1.0))', b1:'NIR', b2:'R', redEdge:false },
  'EVI2':    { label:'EVI2 — Two-Band Enhanced Vegetation Index', eq:'2.5 * ((NIR - R) / (NIR + 2.4 * R + 1.0))', b1:'NIR', b2:'R', redEdge:false },
  'SAVI':    { label:'SAVI — Soil-Adjusted Vegetation Index', eq:'1.5 * ((NIR - R) / (NIR + R + 0.5))', b1:'NIR', b2:'R', redEdge:false },
  'MSAVI':   { label:'MSAVI / MSAVI2 — Modified Soil-Adjusted Vegetation Index', eq:'(2.0 * NIR + 1.0 - sqrt((2.0 * NIR + 1.0) ** 2 - 8.0 * (NIR - R))) / 2.0', b1:'NIR', b2:'R', redEdge:false },
  'OSAVI':   { label:'OSAVI — Optimized Soil-Adjusted Vegetation Index', eq:'(NIR - R) / (NIR + R + 0.16)', b1:'NIR', b2:'R', redEdge:false },
  'ARVI':    { label:'ARVI — Atmospherically Resistant Vegetation Index', eq:'(NIR - (2.0 * R) + B) / (NIR + (2.0 * R) - B)', b1:'NIR', b2:'R', redEdge:false },
  'VARI':    { label:'VARI — Visible Atmospherically Resistant Index', eq:'(G - R) / (G + R - B)', b1:'G', b2:'R', redEdge:false },
  'NDWI':    { label:'NDWI — Normalized Difference Water Index (Gao)', eq:'(NIR - SWIR1) / (NIR + SWIR1)', b1:'NIR', b2:'SWIR1', redEdge:false },
  'MNDWI':   { label:'MNDWI — Modified NDWI (Xu 2006)', eq:'(G - SWIR1) / (G + SWIR1)', b1:'G', b2:'SWIR1', redEdge:false },
  'NDBI':    { label:'NDBI — Normalized Difference Built-up Index', eq:'(SWIR1 - NIR) / (SWIR1 + NIR)', b1:'SWIR1', b2:'NIR', redEdge:false },
  'BSI':     { label:'BSI — Bare Soil Index', eq:'((SWIR1 + R) - (NIR + B)) / ((SWIR1 + R) + (NIR + B))', b1:'SWIR1', b2:'B', redEdge:false },
  'NBR':     { label:'NBR — Normalized Burn Ratio', eq:'(NIR - SWIR2) / (NIR + SWIR2)', b1:'NIR', b2:'SWIR2', redEdge:false },
  'AFRI2100':{ label:'AFRI2100 — Aerosol Free Vegetation Index', eq:'(NIR - 0.5 * SWIR2) / (NIR + 0.5 * SWIR2)', b1:'NIR', b2:'SWIR2', redEdge:false },
  'SLAVI':   { label:'SLAVI — Specific Leaf Area Vegetation Index', eq:'NIR / (R + SWIR2)', b1:'NIR', b2:'R', redEdge:false },
  'SR':      { label:'SR — Simple Ratio', eq:'NIR / R', b1:'NIR', b2:'R', redEdge:false },
  'TRVI':    { label:'TRVI — Transformed Ratio Vegetation Index', eq:'sqrt(NIR / R)', b1:'NIR', b2:'R', redEdge:false },
  'MSR_Red': { label:'MSR Red — Modified Simple Ratio (Red)', eq:'((NIR / R) - 1.0) / sqrt((NIR / R) + 1.0)', b1:'NIR', b2:'R', redEdge:false },
  'RDVI':    { label:'RDVI — Renormalized Difference Vegetation Index', eq:'(NIR - R) / sqrt(NIR + R)', b1:'NIR', b2:'R', redEdge:false },
  'DVI':     { label:'DVI — Difference Vegetation Index', eq:'NIR - R', b1:'NIR', b2:'R', redEdge:false },
  'IPVI':    { label:'IPVI — Infrared Percentage Vegetation Index', eq:'NIR / (NIR + R)', b1:'NIR', b2:'R', redEdge:false },
  'GRVI':    { label:'GRVI — Green Ratio Vegetation Index', eq:'NIR / G', b1:'NIR', b2:'G', redEdge:false },
  'GNDVI':   { label:'GNDVI — Green Normalized Difference Vegetation Index', eq:'(NIR - G) / (NIR + G)', b1:'NIR', b2:'G', redEdge:false },
  'GCI':     { label:'GCI (GCVI) — Green Chlorophyll Index', eq:'(NIR / G) - 1.0', b1:'NIR', b2:'G', redEdge:false },
  'MSR_Green':{ label:'MSR Green — Modified Simple Ratio (Green)', eq:'((NIR / G) - 1.0) / sqrt((NIR / G) + 1.0)', b1:'NIR', b2:'G', redEdge:false },
  'CVI':     { label:'CVI — Chlorophyll Vegetation Index', eq:'(NIR * R) / (G * G)', b1:'NIR', b2:'G', redEdge:false },
  'CCI':     { label:'CCI — Chlorophyll Carotenoid Index', eq:'(G - R) / (G + R)', b1:'G', b2:'R', redEdge:false },
  'GLI':     { label:'GLI — Green Leaf Index', eq:'(2.0 * G - B - R) / (2.0 * G + B + R)', b1:'G', b2:'R', redEdge:false },
  'NDYI':    { label:'NDYI — Normalized Difference Yellowness Index', eq:'(G - B) / (G + B)', b1:'G', b2:'B', redEdge:false },
  'TGI':     { label:'TGI — Triangular Greenness Index', eq:'-0.5 * (190.0 * (R - G) - 120.0 * (G - B))', b1:'G', b2:'R', redEdge:false },
  'TriVI':   { label:'TriVI — Triangular Vegetation Index', eq:'0.5 * (120.0 * (NIR - G) - 200.0 * (R - G))', b1:'NIR', b2:'G', redEdge:false },
  'SIPI':    { label:'SIPI — Structure Insensitive Pigment Index', eq:'(NIR - B) / (NIR - R)', b1:'NIR', b2:'B', redEdge:false },
  'PRI':     { label:'PRI (Proxy) — Photochemical Reflectance Index', eq:'(B - G) / (B + G)', b1:'B', b2:'G', redEdge:false },
  'NNIR':    { label:'NNIR — Normalized Near-Infrared', eq:'NIR / (NIR + R + G)', b1:'NIR', b2:'R', redEdge:false },
  'CAI':     { label:'CAI (Proxy) — Cellulose Absorption Index', eq:'SWIR2 / SWIR1', b1:'SWIR2', b2:'SWIR1', redEdge:false },
  'NDREI':   { label:'NDREI — Normalized Difference Red-Edge Index', eq:'(NIR - RE1) / (NIR + RE1)', b1:'NIR', b2:'RE1', redEdge:true },
  'RENDVI':  { label:'RENDVI — Red Edge NDVI', eq:'(RE2 - RE1) / (RE2 + RE1)', b1:'RE2', b2:'RE1', redEdge:true },
  'CIRE':    { label:'CIRE — Chlorophyll Index Red Edge', eq:'(NIR / RE1) - 1.0', b1:'NIR', b2:'RE1', redEdge:true },
  'MCARI':   { label:'MCARI — Modified Chlorophyll Absorption Ratio Index', eq:'((RE1 - R) - 0.2 * (RE1 - G)) * (RE1 / R)', b1:'RE1', b2:'R', redEdge:true },
  'MTCI':    { label:'MTCI — MERIS Terrestrial Chlorophyll Index', eq:'(RE2 - RE1) / (RE1 - R)', b1:'RE2', b2:'RE1', redEdge:true },
  'mRE_SR':  { label:'mRE-SR — Modified Red Edge Simple Ratio', eq:'((NIR / RE1) - 1.0) / sqrt((NIR / RE1) + 1.0)', b1:'NIR', b2:'RE1', redEdge:true }
};

var PALETTES = {
  'RdYlGn':           ['d73027','f46d43','fdae61','fee08b','d9ef8b','a6d96a','66bd63','1a9850'],
  'NDVI_Custom':      ['FFFFFF','CE7E45','DF923D','F1B555','FCD163','99B718','74A901','66A000','529400','3E8601','207401','056201','004C00'],
  'Vegetation':       ['f7fcf5','e5f5e0','c7e9c0','a1d99b','74c476','41ab5d','238b45','006d2c','00441b'],
  'YlGn':             ['ffffe5','f7fcb9','d9f0a3','addd8e','78c679','41ab5d','238443','005a32'],
  'Agriculture':      ['3f260b','835216','c7a52f','e3e94b','7fc41d','2f800e','134504'],
  'Red2Green':        ['a50026','d73027','f46d43','fdae61','fee08b','ffffbf','d9ef8b','a6d96a','66bd63','1a9850','006837'],
  'YlOrRd (Heat)':    ['ffffcc','ffeda0','fed976','feb24c','fd8d3c','fc4e2a','e31a1c','bd0026','800026'],
  'RdBu (Diverging)': ['b2182b','ef8a62','fddbc7','f7f7f7','d1e5f0','67a9cf','2166ac'],
  'PuOr (Diverging)': ['7f3b08','b35806','e08214','fdb863','fee0b6','f7f7f7','d8daeb','b2abd2','8073ac','542788','2d004b'],
  'BrBG (Diverging)': ['543005','8c510a','bf812d','dfc27d','f6e8c3','f5f5f5','c7eae5','80cdc1','35978f','01665e','003c30'],
  'Water':            ['00008b','0000ff','00bfff','add8e6','ffffff'],
  'Ocean':            ['ffffd9','edf8b1','c7e9b4','7fcdbb','41b6c4','1d91c0','225ea8','253494','081d58'],
  'Blues':            ['f7fbff','deebf7','c6dbef','9ecae1','6baed6','4292c6','2171b5','084594'],
  'Turbo':            ['30123b','4145ab','4675ed','39a2fc','1bcfd4','24eca6','61fc6c','a4fc3c','d1e834','f3c63a','fea031','f3711b','db3a07','b01001','7a0403'],
  'Spectral':         ['d53e4f','f46d43','fdae61','fee08b','ffffbf','e6f598','abdda4','66c2a5','3288bd'],
  'Mako':             ['0b0405','221b34','3b3164','544797','6964b4','7986c7','89a8d5','9ccae1','bfe2eb','def3ee'],
  'Rocket':           ['03051a','1d1c4d','3b2a6b','5d3278','813476','a6366d','c93c5c','e74c44','f8702b','fca51a','f6d833','fae68b'],
  'Viridis':          ['440154','414487','2a788e','22a884','7ad151','fde725'],
  'Magma':            ['000004','3b0f70','8c2981','de4968','fe9f6d','fcfdbf'],
  'Inferno':          ['000004','20114b','57157e','912281','cb4679','eb7852','fdb32f','f0f921'],
  'Plasma':           ['0d0887','46039f','7201a8','9c179e','bd3786','d8576b','ed7953','fb9f3a','fdca26','f0f921'],
  'Cividis':          ['00204d','00336f','164870','345e75','50737b','6e8a83','8ea28c','b0bb98','d3d4a6','f6edb3'],
  'Terrain':          ['006600','009900','33cc33','ffff00','ff9900','cc6600','993300','ffffff'],
  'Urban':            ['1a9850','a6d96a','fee08b','fdae61','f46d43','d73027'],
  'Greys':            ['ffffff','f0f0f0','d9d9d9','bdbdbd','969696','737373','525252','252525'],
  'Rainbow':          ['ff0000','ff7f00','ffff00','00ff00','0000ff','4b0082','8b00ff']
};

var LANG = 'ID'; 
var langElems = [];

var TXT = {
  EN: {
    title: 'EE SPECTRAL EXPLORATION',
    h1: '1 — AREA OF INTEREST (AOI)',
    h2: '2 — UPLOAD ASSETS (Shapefile/Raster)',
    h3: '3 — SENSOR & DATE RANGE',
    h4: '4 — SPECTRAL CALCULATOR',
    h5: '5 — COLOUR PALETTE',
    h6: '6 — LIVE THRESHOLDING',
    h7: '7 — EXECUTE ANALYSIS & RENDER',
    h8: '8 — EXPORT & DIRECT DOWNLOAD',
    hStat: 'AREA STATISTICS',
    hLeg: 'LEGEND',
    lblGuideAOI: 'Use the drawing tools below to define an AOI.',
    btnPoly: '⬟ Polygon',
    btnRect: '⬛ Rectangle',
    btnClear: '🗑 Clear Area',
    lblAssetGuide: 'Paste GEE Asset ID below to use as AOI boundary.',
    lblAsset: 'Or Select Asset from Folder:',
    phFolder: 'Asset Folder Path',
    selEmpty: '-- Search folder first --',
    btnSearch: '🔍 Search',
    btnLoad: '⬆ Load Asset',
    lblSensor: 'Select Sensor:',
    lblTime: 'Time Period:',
    lblCloud: 'Max Cloud Cover:',
    chkMask: 'Apply Cloud Masking',
    lblIdxMode: 'Calculation Mode:',
    lblSelIdx: 'Select Index:',
    lblFormula: 'Formula: (A - B) / (A + B)',
    lblExpr: 'Expression:',
    lblQuick: 'Quick Insert Index:',
    chkReverse: 'Reverse Palette',
    chkEnableThresh: 'Enable Thresholding',
    lblThreshMode: 'Threshold Mode:',
    lblRange: 'Enter Range Criteria:',
    btnApplyThresh: 'Apply Threshold',
    inpLayerName: 'Output layer name...',
    btnRunRender: '▶ RUN & RENDER MAP',
    lblDest: 'Tasks Destination:',
    lblTask: 'Tasks Name:',
    lblFile: 'File Name:',
    lblFolder: 'Folder / Asset Path:',
    lblScale: 'Export Scale:',
    lblCRS: 'CRS:',
    btnExport: '⬇ SEND TO TASKS & GET LINK',
    lblGuideExp: 'NOTE: Direct links limit size to ~32MB. For larger areas, check the Tasks tab.',
    statusWait: '✔ Waiting for input...',
    noRender: 'Run analysis to see charts.',
    calcProg: 'Calculating charts...',
    calcFailed: 'Calculation Failed',
    totalArea: 'Total Area:',
    chartBarTitle: 'Area per Range (Ha)',
    chartPieTitle: 'Range Proportion',
    hAxisRange: 'Range',
    vAxisHa: 'Hectares'
  },
  ID: {
    title: 'EKSPLORASI SPEKTRAL EE',
    h1: '1 — AREA OF INTEREST (AOI)',
    h2: '2 — UNGGAH ASSET (Shapefile/Raster)',
    h3: '3 — SENSOR & RENTANG WAKTU',
    h4: '4 — KALKULATOR SPEKTRAL',
    h5: '5 — PALET WARNA',
    h6: '6 — THRESHOLDING',
    h7: '7 — EKSEKUSI & RENDER',
    h8: '8 — EKSPOR TASKS & UNDUH',
    hStat: 'STATISTIK AREA & GRAFIK',
    hLeg: 'LEGENDA',
    lblGuideAOI: 'Gunakan alat gambar di bawah untuk membuat AOI.',
    btnPoly: '⬟ Poligon',
    btnRect: '⬛ Kotak',
    btnClear: '🗑 Bersihkan',
    lblAssetGuide: 'Pilih Asset GEE dari folder untuk digunakan sebagai AOI.',
    lblAsset: 'Cari dari Folder Asset:',
    phFolder: 'Path Folder Asset (cth: projects/ee...)',
    selEmpty: '-- Cari folder dahulu --',
    btnSearch: '🔍 Cari',
    btnLoad: '⬆ Load Asset',
    lblSensor: 'Pilih Sensor:',
    lblTime: 'Rentang Waktu:',
    lblCloud: 'Maks. Tutupan Awan:',
    chkMask: 'Gunakan Masking Awan',
    lblIdxMode: 'Mode Kalkulasi:',
    lblSelIdx: 'Pilih Indeks:',
    lblFormula: 'Rumus: (A - B) / (A + B)',
    lblExpr: 'Ekspresi / Rumus:',
    lblQuick: 'Sisip Cepat Indeks:',
    chkReverse: 'Balik Palet',
    chkEnableThresh: 'Aktifkan Thresholding',
    lblThreshMode: 'Mode Threshold:',
    lblRange: 'Kriteria Rentang:',
    btnApplyThresh: 'Terapkan',
    inpLayerName: 'Nama layer output...',
    btnRunRender: '▶ JALANKAN & TAMPILKAN',
    lblDest: 'Tujuan Tasks:',
    lblTask: 'Nama Task:',
    lblFile: 'Nama File:',
    lblFolder: 'Folder / Path Asset:',
    lblScale: 'Skala Unduh:',
    lblCRS: 'CRS:',
    btnExport: '⬇ KIRIM TASKS & BUAT LINK',
    lblGuideExp: 'CATATAN: Tautan langsung dibatasi ~32MB. Gunakan tab Tasks jika area terlalu luas.',
    statusWait: '✔ Menunggu input area...',
    noRender: 'Jalankan analisis untuk melihat grafik.',
    calcProg: 'Menghitung grafik...',
    calcFailed: 'Kalkulasi Gagal',
    totalArea: 'Total Luas:',
    chartBarTitle: 'Luas per Rentang (Ha)',
    chartPieTitle: 'Proporsi Rentang',
    hAxisRange: 'Rentang',
    vAxisHa: 'Hektar'
  }
};

// ======================================================================
// UI HELPER FUNCTIONS
// ======================================================================
function T(id, type, w) { langElems.push({id: id, type: type, w: w}); return w; }
function lbl(id, sz, col, bold) { return T(id, 'label', ui.Label(TXT[LANG][id] || id, { fontSize: sz || '11px', color: col || '#000000', margin: '3px 0', fontWeight: bold ? 'bold' : 'normal', backgroundColor: '00000000' })); }
function lblD(text, sz, col, bold, styleExt) { var s = { fontSize: sz || '11px', color: col || '#000000', margin: '3px 0', fontWeight: bold ? 'bold' : 'normal', backgroundColor: '00000000' }; if(styleExt){ for(var k in styleExt) s[k] = styleExt[k]; } return ui.Label(text, s); }
function sep() { return ui.Label('', { backgroundColor:'#dddddd', height:'1px', margin:'6px 0', stretch:'horizontal', padding:'0' }); }
function hdr(id) { return T(id, 'label', ui.Label(TXT[LANG][id] || id, { fontSize:'13px', fontWeight:'bold', color: '#000000', margin:'8px 0 4px 0', backgroundColor:'00000000' })); }
function btn(id, fn) { return T(id, 'button', ui.Button({ label: TXT[LANG][id] || id, style:{stretch:'horizontal', margin:'3px 0', fontSize:'11px', color:'#000000'}, onClick:fn })); }
function inp(id, val) { return T(id, 'textbox', ui.Textbox({ placeholder: TXT[LANG][id] || id, value:val||'', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000000'} })); }
function sldr(mn, mx, v, st) { return ui.Slider({ min:mn, max:mx, value:v, step:st, style:{stretch:'horizontal', margin:'2px 0'} }); }
function selBox(items, val) { return ui.Select({ items:items, value:val, style:{stretch:'horizontal', fontSize:'11px', margin:'2px 0'} }); }
function row2(a, b) { return ui.Panel([a, b], ui.Panel.Layout.flow('horizontal'), {stretch:'horizontal', backgroundColor:'00000000'}); }

// ======================================================================
// LAYOUT SETUP (Responsif Mobile Ketat)
// ======================================================================
var mainMap = ui.root.widgets().get(0);
ui.root.clear();
ui.root.add(mainMap);

// Pengecilan Lebar & Tinggi Maksimal agar tak menabrak logo Google
var panelStyle = { position: 'top-left', width: '290px', maxHeight: '72%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.96)', border: '1px solid #999', shown: true };
var leftPanel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: panelStyle });

var panelStyleRight = { position: 'top-right', width: '290px', maxHeight: '72%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.96)', border: '1px solid #999', shown: false };
var rightPanel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: panelStyleRight });

// Tombol Toggle Kiri + Status Box menempel di sebelahnya (Sangat hemat ruang!)
var btnToggleLeft = ui.Button({ label: '☰ TOOLS', style: { margin: '0', fontSize: '11px', fontWeight: 'bold' },
  onClick: function() { var s = leftPanel.style().get('shown'); leftPanel.style().set('shown', !s); if (!s) rightPanel.style().set('shown', false); }
});
var statusLabel = ui.Label(TXT[LANG].statusWait, { fontSize: '10px', color: '#cc0000', fontWeight: 'bold', margin: '4px 0 0 8px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '3px 6px', border: '1px solid #ccc' });
var leftControl = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'), widgets: [btnToggleLeft, statusLabel], style: { position: 'top-left', padding: '0', backgroundColor: '00000000' } });

// Tombol Toggle Kanan (Grafik)
var btnToggleRight = ui.Button({ label: '📊 GRAFIK', style: { margin: '0', fontSize: '11px', fontWeight: 'bold' },
  onClick: function() { var s = rightPanel.style().get('shown'); rightPanel.style().set('shown', !s); if (!s) leftPanel.style().set('shown', false); }
});
var rightControl = ui.Panel({ widgets: [btnToggleRight], style: { position: 'top-right', padding: '0', backgroundColor: '00000000' } });

var btnCloseLeft = ui.Button({ label: '✖ Tutup (Close)', style: { stretch: 'horizontal', color: '#cc0000', margin: '0 0 6px 0', fontSize:'11px' }, onClick: function() { leftPanel.style().set('shown', false); } });
var btnCloseRight = ui.Button({ label: '✖ Tutup (Close)', style: { stretch: 'horizontal', color: '#cc0000', margin: '0 0 6px 0', fontSize:'11px' }, onClick: function() { rightPanel.style().set('shown', false); } });

// Memasukkan UI ke Peta
mainMap.add(leftControl);
mainMap.add(leftPanel);
mainMap.add(rightControl);
mainMap.add(rightPanel);

mainMap.style().set({ cursor:'crosshair' });
mainMap.setOptions('SATELLITE');
mainMap.setCenter(118.0, -2.5, 5);
var drawingTools = mainMap.drawingTools();
drawingTools.setShown(false);
while (drawingTools.layers().length() > 0) { drawingTools.layers().remove(drawingTools.layers().get(0)); }
drawingTools.layers().add(ui.Map.GeometryLayer({ geometries:[], name:'AOI', color:'#000000' }));

// ======================================================================
// PENGATURAN BAHASA (Masuk ke dalam panel agar tidak merusak UI bawah)
// ======================================================================
var btnEN = ui.Button({label: 'EN', style: {margin: '0 2px', padding: '0', fontSize:'10px', color: '#000000'}, onClick: function(){ switchLang('EN'); }});
var btnID = ui.Button({label: 'ID', style: {margin: '0 2px', padding: '0', fontSize:'10px', color: '#000000', fontWeight: 'bold'}, onClick: function(){ switchLang('ID'); }});
var langPanel = ui.Panel([lblD('Language:', '10px', '#666', true), btnEN, btnID], ui.Panel.Layout.flow('horizontal'), {margin: '0 0 8px 0', backgroundColor: '00000000'});

leftPanel.add(langPanel); // Language ditaruh paling atas di dalam Tools Menu
leftPanel.add(btnCloseLeft);
rightPanel.add(btnCloseRight);

function statusBox(msg, warn) {
  statusLabel.setValue(msg);
  statusLabel.style().set('color', warn ? '#cc0000' : '#006600');
}

function switchLang(l) {
  LANG = l;
  btnEN.style().set('fontWeight', l === 'EN' ? 'bold' : 'normal');
  btnID.style().set('fontWeight', l === 'ID' ? 'bold' : 'normal');
  
  langElems.forEach(function(e) {
    var text = TXT[LANG][e.id]; if (!text) return;
    if (e.type === 'label') { e.w.setValue(text); } 
    else if (e.type === 'button' || e.type === 'checkbox') { e.w.setLabel(text); } 
    else if (e.type === 'textbox') { e.w.setPlaceholder(text); }
  });

  if (selAssetList.items().get(0) === TXT['ID']['selEmpty'] || selAssetList.items().get(0) === TXT['EN']['selEmpty']) {
     selAssetList.items().reset([TXT[LANG]['selEmpty']]);
     selAssetList.setValue(TXT[LANG]['selEmpty']);
  }
  if (statusLabel.getValue() === TXT['ID']['statusWait'] || statusLabel.getValue() === TXT['EN']['statusWait']) {
    statusBox(LANG === 'EN' ? '✔ Waiting for AOI input...' : '✔ Menunggu input area...', false);
  }
  if (STATE.rawImage) {
    var pArr = PALETTES[STATE.selectedPalette].slice();
    if (chkReverse.getValue()) pArr.reverse();
    renderLegend(STATE.layerName, STATE.autoMin, STATE.autoMax, pArr);
    if (STATE.chartData) { drawCharts(); } 
    else { statBox.clear(); statBox.add(lblD(TXT[LANG].noRender, '11px', '#000', false)); }
  } else {
    statBox.clear(); statBox.add(lblD(TXT[LANG].noRender, '11px', '#000', false));
    legendPanel.clear(); legendPanel.add(lblD(TXT[LANG].noRender, '11px', '#000', false));
  }
}

// ======================================================================
// KONTEN LEFT PANEL 
// ======================================================================
leftPanel.add(lbl('title', '14px', '#000000', true));
leftPanel.add(sep());

// 1. AOI
leftPanel.add(hdr('h1'));
leftPanel.add(lbl('lblGuideAOI', '10px', '#000000'));

function clearGeometry() {
  STATE.roi = null;
  while (drawingTools.layers().length() > 0) { drawingTools.layers().remove(drawingTools.layers().get(0)); }
  drawingTools.layers().add(ui.Map.GeometryLayer({ geometries:[], name:'AOI', color:'#000000' }));
  statusBox(LANG === 'EN' ? '✔ Area cleared. Please redraw.' : '✔ Area dibersihkan. Silakan gambar ulang.', false);
}
function drawPolygon()   { clearGeometry(); drawingTools.setShape('polygon');   drawingTools.draw(); leftPanel.style().set('shown', false); statusBox(LANG === 'EN' ? '✏ Polygon mode active...' : '✏ Mode poligon aktif...', false); }
function drawRectangle() { clearGeometry(); drawingTools.setShape('rectangle'); drawingTools.draw(); leftPanel.style().set('shown', false); statusBox(LANG === 'EN' ? '✏ Rectangle mode active...' : '✏ Mode kotak aktif...', false); }

leftPanel.add(row2(btn('btnPoly', drawPolygon), btn('btnRect', drawRectangle)));
leftPanel.add(btn('btnClear', clearGeometry));

drawingTools.onDraw(ui.util.debounce(function() {
  var layers = drawingTools.layers();
  if (layers.length() > 0 && layers.get(0).geometries().length() > 0) {
    var geom = layers.get(0).geometries().get(0);
    STATE.roi = ee.FeatureCollection([ee.Feature(geom)]);
    layers.get(0).setShown(false); drawingTools.setShape(null);
    statusBox(LANG === 'EN' ? '✔ AOI drawn. Open Menu.' : '✔ AOI selesai. Buka Menu.', false);
  }
}, 500));
leftPanel.add(sep());

// 2. UPLOAD ASSETS
leftPanel.add(hdr('h2'));
leftPanel.add(lbl('lblAssetGuide', '10px', '#000000'));
var inpFolderId = inp('phFolder', 'projects/ee-rdhgstwnn18/assets/EE_EXPLORATION');
var selAssetList = selBox([TXT[LANG]['selEmpty']], TXT[LANG]['selEmpty']);
var btnCariAsset = btn('btnSearch', function() {
  var folderId = inpFolderId.getValue().replace(/['"]/g, '').trim(); 
  if (!folderId) { statusBox(LANG === 'EN' ? '⚠ Folder path is empty!' : '⚠ Path folder kosong!', true); return; }
  statusBox(LANG === 'EN' ? '⏳ Searching...' : '⏳ Mencari...', false);
  ee.data.getList({id: folderId}, function(list, err) {
    if (err) { statusBox(LANG === 'EN' ? '⚠ Failed to find folder.' : '⚠ Gagal mencari folder.', true); return; }
    if (list && list.length > 0) {
      var items = [];
      list.forEach(function(item) {
        var t = String(item.type).toUpperCase();
        if (t === 'TABLE' || t === 'FEATURECOLLECTION' || t === 'FEATURE_COLLECTION') { items.push(item.id); }
      });
      if(items.length === 0) { statusBox(LANG === 'EN' ? '⚠ No SHP found.' : '⚠ Tidak ada SHP.', true); return; }
      selAssetList.items().reset(items); selAssetList.setValue(items[0]);
      statusBox(LANG === 'EN' ? '✔ Found ' + items.length + ' assets.' : '✔ Ditemukan ' + items.length + ' asset.', false);
    } else { statusBox(LANG === 'EN' ? '⚠ Folder empty.' : '⚠ Folder kosong.', true); }
  });
});
var btnLoadSelected = btn('btnLoad', function() {
  var assetId = selAssetList.getValue();
  if (!assetId || assetId.indexOf('--') > -1) { statusBox(LANG === 'EN' ? '⚠ Select asset.' : '⚠ Pilih asset valid.', true); return; }
  statusBox(LANG === 'EN' ? '⏳ Loading asset...' : '⏳ Memuat asset...', false);
  try {
    var asset = ee.FeatureCollection(assetId);
    asset.size().evaluate(function(sz, err) {
      if (err) { statusBox(LANG === 'EN' ? '⚠ Load failed.' : '⚠ Gagal memuat.', true); return; }
      clearGeometry(); STATE.roi = asset; mainMap.centerObject(asset, 10);
      if (STATE.roiLayer) mainMap.remove(STATE.roiLayer);
      STATE.roiLayer = ui.Map.Layer(asset.style({color:'#000000', fillColor:'00000000', width:2}), {}, 'Loaded Asset');
      mainMap.add(STATE.roiLayer);
      statusBox(LANG === 'EN' ? '✔ Loaded (' + sz + ' features).' : '✔ Dimuat (' + sz + ' fitur).', false);
    });
  } catch(e) { statusBox(LANG === 'EN' ? '⚠ Invalid asset.' : '⚠ Asset tidak valid.', true); }
});

leftPanel.add(inpFolderId); leftPanel.add(row2(btnCariAsset, btnLoadSelected)); leftPanel.add(selAssetList);
leftPanel.add(sep());

// 3. SENSOR & WAKTU
leftPanel.add(hdr('h3'));
var selSensor = selBox(Object.keys(SENSORS), 'Sentinel-2 SR');
leftPanel.add(lbl('lblSensor', '10px', '#000')); leftPanel.add(selSensor);
var inpStart = ui.Textbox({ value: CFG.startDate, style: {stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} });
var inpEnd   = ui.Textbox({ value: CFG.endDate, style: {stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} });
leftPanel.add(lbl('lblTime', '10px', '#000')); leftPanel.add(row2(inpStart, inpEnd));
var cloudSlider = sldr(5, 100, CFG.cloudMax, 5); var cloudDisp = lblD(CFG.cloudMax + '%', '10px', '#000', true);
cloudSlider.onChange(function(v) { CFG.cloudMax = Math.round(v); cloudDisp.setValue(Math.round(v) + '%'); });
leftPanel.add(lbl('lblCloud', '10px', '#000')); leftPanel.add(row2(cloudSlider, cloudDisp));
var chkMaskW = T('chkMask', 'checkbox', ui.Checkbox({ label: TXT[LANG].chkMask, value:true, style: { fontSize:'11px', margin:'2px 0', color:'#000', fontWeight:'bold' } }));
var selMaskMethod = ui.Select({ style: { stretch:'horizontal', fontSize:'11px', margin:'2px 0' } });
leftPanel.add(chkMaskW); leftPanel.add(selMaskMethod); chkMaskW.onChange(function(v) { selMaskMethod.setDisabled(!v); });
leftPanel.add(sep());

// 4. CALCULATOR
leftPanel.add(hdr('h4'));
var selCalcMode = selBox(['1. Ready-Use Index', '2. Normalized Difference', '3. Raster Calculator'], '1. Ready-Use Index');
leftPanel.add(lbl('lblIdxMode', '10px', '#000')); leftPanel.add(selCalcMode);

var calcContainer = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { backgroundColor:'00000000', margin:'2px 0' } });
leftPanel.add(calcContainer);

// UPDATE UX: Memendekkan teks Dropdown dan menaruh kepanjangannya di Label bawahnya
var idxKeys = Object.keys(INDICES_LOGIC); 
var selIdx = selBox(idxKeys, idxKeys[0]);
var lblIdxDesc = lblD(INDICES_LOGIC[idxKeys[0]].label, '10px', '#555555', false, {fontStyle: 'italic'});

var selND1 = ui.Select({ style: { stretch:'horizontal', fontSize:'11px', margin:'2px 0' } });
var selND2 = ui.Select({ style: { stretch:'horizontal', fontSize:'11px', margin:'2px 0' } });
var inpExpr = T('lblExpr', 'textbox', ui.Textbox({ placeholder: TXT[LANG].lblExpr, value:'', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color: '#000'} }));

var numpadGrid = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { backgroundColor:'00000000', margin:'2px 0' } });
var panelMode1 = ui.Panel([lbl('lblSelIdx', '10px', '#000'), selIdx, lblIdxDesc], ui.Panel.Layout.flow('vertical'), { backgroundColor:'00000000' });
var panelMode2 = ui.Panel([lbl('lblFormula', '10px', '#000'), row2(selND1, selND2)], ui.Panel.Layout.flow('vertical'), { backgroundColor:'00000000' });
var panelMode3 = ui.Panel([lbl('lblExpr', '10px', '#000'), inpExpr, numpadGrid], ui.Panel.Layout.flow('vertical'), { backgroundColor:'00000000' });
calcContainer.add(panelMode1); calcContainer.add(panelMode2); calcContainer.add(panelMode3);

// 5. PALETTE
leftPanel.add(sep()); leftPanel.add(hdr('h5'));
var activePaletteLabel = lblD('Active Palette: RdYlGn', '10px', '#000', true); leftPanel.add(activePaletteLabel);
var paletteContainer = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { margin:'2px 0', padding:'4px', backgroundColor:'#f9f9f9', border:'1px solid #ccc', height:'120px' } });
leftPanel.add(paletteContainer);

function buildPaletteUI() {
  paletteContainer.clear();
  Object.keys(PALETTES).forEach(function(key) {
    var pArr = PALETTES[key];
    var pPanel = ui.Panel({ layout: ui.Panel.Layout.flow('horizontal'), style: { margin:'1px 0', stretch:'horizontal', backgroundColor:'00000000' } });
    var btnSelect = ui.Button({ label:key, style: { margin:'0 4px 0 0', padding:'0', fontSize:'10px', width:'110px', color: '#000' },
      onClick: function() { STATE.selectedPalette = key; activePaletteLabel.setValue((LANG === 'EN' ? 'Active Palette: ' : 'Palet Aktif: ') + key); updateMapVis(); }
    });
    var thumb = ui.Thumbnail({ image: ee.Image.pixelLonLat().select(0), params: { bbox:[0,0,1,0.1], dimensions:'110x10', format:'png', min:0, max:1, palette:pArr }, style: { stretch:'horizontal', maxHeight:'10px', margin:'4px 0', border:'1px solid #000' } });
    pPanel.add(btnSelect); pPanel.add(thumb); paletteContainer.add(pPanel);
  });
}
buildPaletteUI();
var chkReverse = T('chkReverse', 'checkbox', ui.Checkbox({ label:TXT[LANG].chkReverse, value:false, style: { fontSize:'11px', margin:'2px 0', color:'#000' } }));
chkReverse.onChange(updateMapVis); leftPanel.add(chkReverse);

// 6. THRESHOLDING
leftPanel.add(sep()); leftPanel.add(hdr('h6'));
var chkEnableThresh = T('chkEnableThresh', 'checkbox', ui.Checkbox({ label:TXT[LANG].chkEnableThresh, value:false, style: { fontSize:'11px', margin:'0 0 4px 0', color:'#000', fontWeight:'bold' } })); leftPanel.add(chkEnableThresh);
var threshContainer = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { shown:false, backgroundColor:'#f9f9f9', border:'1px solid #ccc', padding:'4px' } });
var selThreshMode = selBox(['1 Criterion (Lower Bound)', '2 Criteria (Min & Max Range)'], '1 Criterion (Lower Bound)');
threshContainer.add(lbl('lblThreshMode', '10px', '#000')); threshContainer.add(selThreshMode);
var panThresh1 = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { backgroundColor:'00000000' } });
var lblThresh1 = lblD('Threshold: -1.00', '10px', '#000', true); var sldrThresh = sldr(-1.0, 1.0, -1.0, 0.01);
panThresh1.add(lblThresh1); panThresh1.add(sldrThresh);
var panThresh2 = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { shown:false, backgroundColor:'00000000' } });
var inpThreshMin = ui.Textbox({ placeholder: 'Min', value: '-1.0', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} });
var inpThreshMax = ui.Textbox({ placeholder: 'Max', value: '1.0', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} });
panThresh2.add(lbl('lblRange', '10px', '#000')); panThresh2.add(row2(inpThreshMin, inpThreshMax)); panThresh2.add(btn('btnApplyThresh', updateMapVis));
threshContainer.add(panThresh1); threshContainer.add(panThresh2); leftPanel.add(threshContainer);
chkEnableThresh.onChange(function(v) { threshContainer.style().set('shown', v); updateMapVis(); });
selThreshMode.onChange(function(v) { panThresh1.style().set('shown', v.indexOf('1') === 0); panThresh2.style().set('shown', v.indexOf('2') === 0); updateMapVis(); });
sldrThresh.onChange(function(v) { lblThresh1.setValue('Threshold: ' + v.toFixed(2)); updateMapVis(); });

// 7. EXECUTE
leftPanel.add(sep()); leftPanel.add(hdr('h7'));
var inpLayerName = inp('inpLayerName', 'Index_Result_Map'); leftPanel.add(inpLayerName);
leftPanel.add(btn('btnRunRender', runAnalysis));

// 8. EXPORT & DOWNLOAD
leftPanel.add(sep()); leftPanel.add(hdr('h8'));
var selExportDest = selBox(['Google Drive', 'GEE Asset'], 'Google Drive'); leftPanel.add(lbl('lblDest', '10px', '#000')); leftPanel.add(selExportDest);
var inpTaskName = ui.Textbox({ value: 'Export_Task', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} }); leftPanel.add(lbl('lblTask', '10px', '#000')); leftPanel.add(inpTaskName);
var inpFileName = ui.Textbox({ value: 'Spectral_Index', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} }); leftPanel.add(lbl('lblFile', '10px', '#000')); leftPanel.add(inpFileName);
var inpExportFolder = ui.Textbox({ value: 'GEE_Workspace', style:{stretch:'horizontal', margin:'2px 0', fontSize:'11px', color:'#000'} }); leftPanel.add(lbl('lblFolder', '10px', '#000')); leftPanel.add(inpExportFolder);

var selExportScale = selBox(['10', '20', '30', '100', '250', '500'], '10');
var selExportCRS = selBox(['EPSG:4326 (WGS 1984)', 'EPSG:3857'], 'EPSG:4326 (WGS 1984)');
var boxScale = ui.Panel([lbl('lblScale', '10px', '#000'), selExportScale], ui.Panel.Layout.flow('vertical'), {backgroundColor:'00000000', width:'120px'});
var boxCRS = ui.Panel([lbl('lblCRS', '10px', '#000'), selExportCRS], ui.Panel.Layout.flow('vertical'), {backgroundColor:'00000000', width:'120px'});
leftPanel.add(ui.Panel([boxScale, boxCRS], ui.Panel.Layout.flow('horizontal'), {backgroundColor:'00000000'}));

leftPanel.add(ui.Label('', {margin:'2px 0', padding:'0'})); 
leftPanel.add(btn('btnExport', exportAndDownload));
leftPanel.add(lbl('lblGuideExp', '9px', '#666', false));

var linkPanel = ui.Panel({layout: ui.Panel.Layout.flow('vertical'), style: {backgroundColor: '00000000', padding: '0', margin: '2px 0'}});
leftPanel.add(linkPanel);

// ======================================================================
// RIGHT PANEL (Statistik)
// ======================================================================
rightPanel.add(hdr('hStat'));
var statBox = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { margin:'2px 0', padding:'8px', backgroundColor:'#f9f9f9', border:'1px solid #ccc' } });
statBox.add(lblD(TXT[LANG].noRender, '11px', '#000', false)); rightPanel.add(statBox);
rightPanel.add(sep());
rightPanel.add(hdr('hLeg'));
var legendPanel = ui.Panel({ layout: ui.Panel.Layout.flow('vertical'), style: { margin:'2px 0', padding:'8px', backgroundColor:'#f9f9f9', border:'1px solid #ccc' } });
legendPanel.add(lblD(TXT[LANG].noRender, '11px', '#000', false)); rightPanel.add(legendPanel);

// ======================================================================
// LOGIC FUNCTIONS
// ======================================================================

function updateMapVis() {
  if (!STATE.rawImage) return;
  var pArr = PALETTES[STATE.selectedPalette].slice();
  if (chkReverse.getValue()) pArr.reverse();
  STATE.visParams.palette = pArr;

  var finalDisp = STATE.rawImage;
  if (chkEnableThresh.getValue()) {
    var tMode = selThreshMode.getValue();
    if (tMode.indexOf('1') === 0) { finalDisp = finalDisp.updateMask(STATE.rawImage.gte(sldrThresh.getValue())); } 
    else {
      var tMin = parseFloat(inpThreshMin.getValue()); var tMax = parseFloat(inpThreshMax.getValue());
      if (!isNaN(tMin)) finalDisp = finalDisp.updateMask(STATE.rawImage.gte(tMin));
      if (!isNaN(tMax)) finalDisp = finalDisp.updateMask(STATE.rawImage.lte(tMax));
    }
  }
  var layers = mainMap.layers();
  if (layers.length() > 1) { layers.set(1, ui.Map.Layer(finalDisp, STATE.visParams, STATE.layerName, layers.get(1).getShown())); }
  renderLegend(STATE.layerName, STATE.visParams.min, STATE.visParams.max, pArr);
}

function calculateAreaAndChart() {
  if (!STATE.rawImage || !STATE.roi) return;
  statBox.clear(); statBox.add(lblD(TXT[LANG].calcProg, '10px', '#000'));
  
  var finalImg = STATE.rawImage;
  if (chkEnableThresh.getValue()) {
    var tMode = selThreshMode.getValue();
    if (tMode.indexOf('1') === 0) { finalImg = finalImg.updateMask(STATE.rawImage.gte(sldrThresh.getValue())); } 
    else {
      var tMin = parseFloat(inpThreshMin.getValue()); var tMax = parseFloat(inpThreshMax.getValue());
      if (!isNaN(tMin)) finalImg = finalImg.updateMask(STATE.rawImage.gte(tMin));
      if (!isNaN(tMax)) finalImg = finalImg.updateMask(STATE.rawImage.lte(tMax));
    }
  }

  var min = STATE.autoMin; var max = STATE.autoMax; var step = (max - min) / 5; if (step === 0) step = 0.1;
  var b1 = min + step; var b2 = min + 2*step; var b3 = min + 3*step; var b4 = min + 4*step;
  var classified = ee.Image(0).where(finalImg.lt(b1), 1).where(finalImg.gte(b1).and(finalImg.lt(b2)), 2).where(finalImg.gte(b2).and(finalImg.lt(b3)), 3).where(finalImg.gte(b3).and(finalImg.lt(b4)), 4).where(finalImg.gte(b4), 5).updateMask(finalImg.mask());
  var areaImg = ee.Image.pixelArea().addBands(classified);

  areaImg.reduceRegion({ reducer: ee.Reducer.sum().group({ groupField: 1, groupName: 'class' }), geometry: STATE.roi.geometry(), scale: 10, maxPixels: 1e13
  }).evaluate(function(res, err) {
     if (err || !res || !res.groups) { STATE.chartData = null; statBox.clear(); statBox.add(lblD(TXT[LANG].calcFailed, '11px', '#cc0000', true)); return; }
     STATE.chartData = res.groups; drawCharts(); 
  });
}

function drawCharts() {
  if (!STATE.chartData) return;
  statBox.clear();
  var min = STATE.autoMin; var max = STATE.autoMax; var step = (max - min) / 5; if (step === 0) step = 0.1;
  var totalArea = 0; var dt = { cols: [ {id: 'class', label: TXT[LANG].hAxisRange, type: 'string'}, {id: 'area', label: TXT[LANG].vAxisHa, type: 'number'}, {id: 'style', role: 'style', type: 'string'} ], rows: [] };
  var pieColors = []; var pArr = STATE.visParams.palette;
  var getBinColor = function(binIdx) { return '#' + pArr[Math.floor((binIdx - 1) / 4 * (pArr.length - 1))]; };
  var areaDict = {}; STATE.chartData.forEach(function(g) { areaDict[g.class] = g.sum / 10000; });

  for (var i = 1; i <= 5; i++) {
    var areaHa = areaDict[i] || 0; totalArea += areaHa;
    var rangeStart = (min + (i-1)*step).toFixed(2); var rangeEnd = (i===5 ? max.toFixed(2) : (min + i*step).toFixed(2));
    var rangeStr = rangeStart + ' - ' + rangeEnd; var color = getBinColor(i);
    if(areaHa > 0) {
        dt.rows.push({c: [{v: rangeStr}, {v: areaHa}, {v: color}]}); pieColors.push(color);
        var row = ui.Panel([ ui.Label('■', { color: color, margin: '1px 5px 0 0', fontSize: '11px' }), ui.Label(rangeStr + ' :', {fontSize:'10px', width:'100px', margin:'2px 0', color: '#000'}), ui.Label(areaHa.toFixed(2) + ' Ha', {fontSize:'10px', fontWeight:'bold', margin:'2px 0', color: '#000'}) ], ui.Panel.Layout.flow('horizontal'), {margin:'0', backgroundColor: '00000000'});
        statBox.add(row);
    }
  }

  statBox.add(sep());
  statBox.add(ui.Panel([ lblD(TXT[LANG].totalArea, '11px', '#000', true), lblD(totalArea.toFixed(2) + ' Ha', '11px', '#000', true) ], ui.Panel.Layout.flow('horizontal'), {margin:'0', backgroundColor: '00000000'}));
  statBox.add(sep());

  if(totalArea > 0) {
      var barChart = ui.Chart(dt, 'ColumnChart', { title: TXT[LANG].chartBarTitle, legend: {position: 'none'}, vAxis: {title: TXT[LANG].vAxisHa, textStyle: {color: '#000'}}, hAxis: {title: TXT[LANG].hAxisRange, textStyle: {color: '#000'}}, backgroundColor: '#f9f9f9', chartArea: {backgroundColor: '#ffffff'} });
      barChart.style().set({stretch: 'horizontal', height: '170px', margin: '6px 0'});
      var pieChart = ui.Chart(dt, 'PieChart', { title: TXT[LANG].chartPieTitle, colors: pieColors, backgroundColor: '#f9f9f9', legend: {textStyle: {color: '#000'}}, chartArea: {backgroundColor: '#ffffff'} });
      pieChart.style().set({stretch: 'horizontal', height: '170px', margin: '6px 0'});
      statBox.add(barChart); statBox.add(pieChart);
  }
}

function resolveAlias(alias, sData) { return sData.map[alias] || alias; }
function resolveEquation(eq, sData) { var aliasOrder = ['SWIR2','SWIR1','NIR2','NIR','RE3','RE2','RE1','R','G','B']; aliasOrder.forEach(function(a) { eq = eq.replace(new RegExp('\\b' + a + '\\b', 'g'), resolveAlias(a, sData) || a); }); return eq; }
function getExprForIndex(idxKey) { var sData = SENSORS[selSensor.getValue()]; return resolveEquation(INDICES_LOGIC[idxKey].eq, sData); }

function rebuildNumpad() {
  numpadGrid.clear(); var sData = SENSORS[selSensor.getValue()]; var mathBtns = ['+','-','*','/','(',')','^','sqrt(','**']; var ctrlBtns = [' DEL ',' CLR '];
  var p1 = ui.Panel({layout: ui.Panel.Layout.flow('horizontal', {wrap:true}), style:{backgroundColor:'00000000', margin:'0'}});
  var p2 = ui.Panel({layout: ui.Panel.Layout.flow('horizontal', {wrap:true}), style:{backgroundColor:'00000000', margin:'0', maxHeight:'120px'}});
  mathBtns.concat(sData.bands).concat(ctrlBtns).forEach(function(l) {
    var isCtrl = (l===' DEL '||l===' CLR ');
    p1.add(ui.Button({ label:l, style: { margin:'1px', padding:'0', fontSize:'11px', color: '#000', fontWeight: isCtrl ? 'bold' : 'normal' },
      onClick: function() { var v = inpExpr.getValue() || ''; if (l===' CLR ') inpExpr.setValue(''); else if (l===' DEL ') inpExpr.setValue(v.slice(0,-1)); else inpExpr.setValue(v + l); }
    }));
  });
  idxKeys.forEach(function(idx) { p2.add(ui.Button({ label: idx, style: { margin:'1px', padding:'0', fontSize:'10px', color:'#000' }, onClick: function() { var v = inpExpr.getValue() || ''; var eq = getExprForIndex(idx); inpExpr.setValue(v + '(' + eq + ')'); } })); });
  numpadGrid.add(p1); numpadGrid.add(lbl('lblQuick', '10px', '#000')); numpadGrid.add(p2);
}

function updateBandsAndFormulas() {
  var sData = SENSORS[selSensor.getValue()]; var c1 = selND1.getValue(), c2 = selND2.getValue();
  selND1.items().reset(sData.bands); selND2.items().reset(sData.bands);
  if (c1 && sData.bands.indexOf(c1) > -1) selND1.setValue(c1); else selND1.setValue(sData.bands[0]);
  if (c2 && sData.bands.indexOf(c2) > -1) selND2.setValue(c2); else selND2.setValue(sData.bands[1]);
  if (sData.scaleType === 'S2') { selMaskMethod.items().reset(['Cloud Score+ (CS+)', 'SCL — ESA', 'QA60 — Bitmask']); selMaskMethod.setValue('Cloud Score+ (CS+)'); } 
  else { selMaskMethod.items().reset(['QA_PIXEL — Landsat']); selMaskMethod.setValue('QA_PIXEL — Landsat'); }
  rebuildNumpad();
  
  var selKey = selIdx.getValue();
  if (selKey && INDICES_LOGIC[selKey]) {
    var logic = INDICES_LOGIC[selKey];
    lblIdxDesc.setValue(logic.label); // Menampilkan deskripsi panjang di bawahnya
    var b1 = resolveAlias(logic.b1, sData); var b2 = resolveAlias(logic.b2, sData); 
    if (sData.bands.indexOf(b1) > -1) selND1.setValue(b1); if (sData.bands.indexOf(b2) > -1) selND2.setValue(b2); 
    inpExpr.setValue(getExprForIndex(selKey)); 
  }
}

function updateCalcUI() { var m = selCalcMode.getValue().charAt(0); panelMode1.style().set('shown', m === '1'); panelMode2.style().set('shown', m === '2'); panelMode3.style().set('shown', m === '3'); }
selSensor.onChange(function() { updateBandsAndFormulas(); statusBox(LANG === 'EN' ? '✔ Sensor changed.' : '✔ Sensor diubah.', false); });
selIdx.onChange(function() { updateBandsAndFormulas(); }); selCalcMode.onChange(updateCalcUI); updateBandsAndFormulas(); updateCalcUI();

function maskS2_QA60(image) { var qa = image.select('QA60'); return image.updateMask( qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0)) ); }
function maskL89(image) { var qa = image.select('QA_PIXEL'); return image.updateMask( qa.bitwiseAnd(1<<1).eq(0).and(qa.bitwiseAnd(1<<2).eq(0)).and(qa.bitwiseAnd(1<<3).eq(0)).and(qa.bitwiseAnd(1<<4).eq(0)) ); }

function computeIndexLogic(img) {
  var sData = SENSORS[selSensor.getValue()]; var bMap = {}; sData.bands.forEach(function(b) { bMap[b] = img.select(b); });
  var mode = selCalcMode.getValue().charAt(0);
  if (mode === '1') {
    var matchKey = selIdx.getValue();
    if (!matchKey || !INDICES_LOGIC[matchKey]) throw new Error('Index not found'); 
    var eq = resolveEquation(INDICES_LOGIC[matchKey].eq, sData).replace(/\*\*/g,'**').replace(/\^/g,'**'); return img.expression(eq, bMap);
  } else if (mode === '2') { return img.normalizedDifference([selND1.getValue(), selND2.getValue()]);
  } else if (mode === '3') { var expr = inpExpr.getValue().replace(/\^/g,'**'); return img.expression(expr, bMap); }
}

function renderLegend(title, minVal, maxVal, paletteArr) {
  legendPanel.clear(); legendPanel.add(lblD(title, '11px', '#000', true));
  legendPanel.add(ui.Thumbnail({ image: ee.Image.pixelLonLat().select(0), params: { bbox:[0,0,1,0.1], dimensions:'240x12', format:'png', min:0, max:1, palette:paletteArr }, style: { stretch:'horizontal', maxHeight:'12px', margin:'4px 0', border:'1px solid #000' } }));
  var ticks = [0, 0.25, 0.5, 0.75, 1].map(function(f) { return ui.Label((minVal + f*(maxVal-minVal)).toFixed(2), { fontSize:'10px', color:'#000', stretch:'horizontal', textAlign:'center', backgroundColor: '00000000' }); });
  legendPanel.add(ui.Panel(ticks, ui.Panel.Layout.flow('horizontal'), { stretch:'horizontal', margin:'0', backgroundColor:'00000000' }));
}

function buildCollection() {
  var ds = inpStart.getValue(), de = inpEnd.getValue(); STATE.sData = SENSORS[selSensor.getValue()];
  var col = ee.ImageCollection(STATE.sData.col).filterBounds(STATE.roi).filterDate(ds, ee.Date(de).advance(1, 'day')).filter(ee.Filter.lt(STATE.sData.cloud, CFG.cloudMax));
  if (chkMaskW.getValue()) {
    var maskType = selMaskMethod.getValue();
    if (STATE.sData.scaleType === 'S2') {
      if (maskType.indexOf('Cloud Score+') > -1) { var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED'); col = col.linkCollection(csPlus, ['cs_cdf']).map(function(img) { return img.updateMask(img.select('cs_cdf').gte(0.60)).divide(10000).copyProperties(img, ['system:time_start']); }); } 
      else if (maskType.indexOf('SCL') > -1) { col = col.map(function(img) { var scl = img.select('SCL'); var mask = scl.neq(3).and(scl.neq(7)).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11)); return img.updateMask(mask).divide(10000).copyProperties(img, ['system:time_start']); }); } 
      else { col = col.map(function(img) { return maskS2_QA60(img).divide(10000).copyProperties(img, ['system:time_start']); }); }
    } else { col = col.map(function(img) { return maskL89(img).multiply(0.0000275).add(-0.2).copyProperties(img, ['system:time_start']); }); }
  } else {
    if (STATE.sData.scaleType === 'S2') { col = col.map(function(img) { return img.divide(10000).copyProperties(img, ['system:time_start']); }); } 
    else { col = col.map(function(img) { return img.multiply(0.0000275).add(-0.2).copyProperties(img, ['system:time_start']); }); }
  }
  return col;
}

function runAnalysis() {
  if (!STATE.roi) { statusBox(LANG === 'EN' ? '⚠ Define an AOI first.' : '⚠ Tentukan AOI dahulu.', true); return; }
  var ds = inpStart.getValue(), de = inpEnd.getValue();
  if (!ds || !de) { statusBox(LANG === 'EN' ? '⚠ Invalid dates.' : '⚠ Waktu tidak valid.', true); return; }

  var mode = selCalcMode.getValue().charAt(0); var baseName = 'Index';
  if (mode === '1') { 
    baseName = (selIdx.getValue() || 'Index').replace(/[^a-zA-Z0-9_]/g, ''); 
  } else if (mode === '2') { baseName = 'ND_' + selND1.getValue() + '_' + selND2.getValue(); } 
  else if (mode === '3') { baseName = 'Custom'; }
  var yrStart = ds.substring(0, 4); var yrEnd = de.substring(0, 4); var yrStr = (yrStart === yrEnd) ? yrStart : yrStart + '_' + yrEnd;
  var autoName = baseName + '_' + yrStr;

  inpLayerName.setValue(autoName); inpFileName.setValue(autoName); inpTaskName.setValue('Task_' + autoName); 
  statusBox(LANG === 'EN' ? '⏳ Preparing images...' : '⏳ Menyiapkan citra...', false);

  var col = buildCollection(); var roiGeom = STATE.roi.geometry(); STATE.composite = col.median().clip(roiGeom);
  STATE.layerName = inpLayerName.getValue() || 'Output';

  try { STATE.rawImage = computeIndexLogic(STATE.composite).rename(STATE.layerName); } 
  catch(err) { statusBox('⚠ Error: ' + err, true); return; }

  statusBox(LANG === 'EN' ? '⏳ Computing statistics...' : '⏳ Menghitung statistik...', false);
  STATE.rawImage.reduceRegion({ reducer: ee.Reducer.minMax(), geometry: roiGeom, scale: 30, bestEffort: true, maxPixels: 1e9
  }).evaluate(function(stats) {
    if (!stats || Object.keys(stats).length === 0) { statusBox(LANG === 'EN' ? '⚠ Stats failed (cloud cover?).' : '⚠ Statistik gagal.', true); return; }
    STATE.autoMin = stats[STATE.layerName + '_min'] !== undefined ? stats[STATE.layerName + '_min'] : -1;
    STATE.autoMax = stats[STATE.layerName + '_max'] !== undefined ? stats[STATE.layerName + '_max'] : 1;
    if (STATE.autoMin === STATE.autoMax) STATE.autoMax = STATE.autoMin + 0.1;
    renderMapOnly();
  });
}

function renderMapOnly() {
  statusBox(LANG === 'EN' ? '⏳ Rendering map...' : '⏳ Menampilkan peta...', false);
  var pArr = PALETTES[STATE.selectedPalette].slice(); if (chkReverse.getValue()) pArr.reverse();
  STATE.visParams = { min: STATE.autoMin, max: STATE.autoMax, palette: pArr };
  var finalDisp = STATE.rawImage;
  if (chkEnableThresh.getValue()) {
    var tMode = selThreshMode.getValue();
    if (tMode.indexOf('1') === 0) { finalDisp = finalDisp.updateMask(STATE.rawImage.gte(sldrThresh.getValue())); } 
    else { var tMin = parseFloat(inpThreshMin.getValue()); var tMax = parseFloat(inpThreshMax.getValue()); if (!isNaN(tMin)) finalDisp = finalDisp.updateMask(STATE.rawImage.gte(tMin)); if (!isNaN(tMax)) finalDisp = finalDisp.updateMask(STATE.rawImage.lte(tMax)); }
  }
  mainMap.layers().reset();
  mainMap.addLayer(STATE.composite.select(STATE.sData.trueColor), { min:0.0, max:0.25, gamma:1.3 }, 'True Color', false);
  mainMap.addLayer(finalDisp, STATE.visParams, STATE.layerName);

  renderLegend(STATE.layerName, STATE.autoMin, STATE.autoMax, pArr);
  statusBox(LANG === 'EN' ? '✔ Map rendered successfully.' : '✔ Peta berhasil ditampilkan.', false);
  linkPanel.clear(); leftPanel.style().set('shown', false); rightPanel.style().set('shown', true); 
  calculateAreaAndChart();
}

function exportAndDownload() {
  if (!STATE.rawImage || !STATE.roi) { statusBox(LANG === 'EN' ? '⚠ Run analysis before exporting.' : '⚠ Jalankan analisis dahulu.', true); return; }
  statusBox(LANG === 'EN' ? '⏳ Processing Export & Link...' : '⏳ Memproses Ekspor & Link...', false);

  var taskName = (inpTaskName.getValue() || 'Task').replace(/\s+/g, '_'); var fileName = (inpFileName.getValue() || 'Output').replace(/\s+/g, '_');
  var folder = inpExportFolder.getValue() || 'GEE_Exports'; var scale = parseInt(selExportScale.getValue(), 10) || 10;
  var crsString = selExportCRS.getValue() || 'EPSG:4326'; var crs = crsString.split(' ')[0]; var dest = selExportDest.getValue(); var roiGeom = STATE.roi.geometry();

  if (dest === 'Google Drive') { Export.image.toDrive({ image: STATE.rawImage, description: taskName, folder: folder, fileNamePrefix: fileName, region: roiGeom, scale: scale, crs: crs, maxPixels: 1e13, fileFormat: 'GeoTIFF' }); } 
  else { var assetPath = folder.replace(/\/$/, '') + '/' + taskName; Export.image.toAsset({ image: STATE.rawImage, description: taskName, assetId: assetPath, region: roiGeom, scale: scale, crs: crs, maxPixels: 1e13 }); }

  STATE.rawImage.getDownloadURL({ name: fileName, bands: [STATE.layerName], region: roiGeom, scale: scale, crs: crs, format: 'GEO_TIFF'
  }, function(url, err) {
     if (err) { statusBox('⚠ Task sent, Link Error: ' + err, true); } 
     else {
       statusBox(LANG === 'EN' ? '✔ Task queued & Link ready!' : '✔ Task terkirim & Tautan siap!', false);
       linkPanel.clear();
       linkPanel.add(ui.Label({ value: LANG === 'EN' ? '⬇ DOWNLOAD TIFF' : '⬇ UNDUH TIFF', targetUrl: url, style: { color: '#0055ff', fontWeight: 'bold', margin: '4px 0', fontSize: '13px', backgroundColor: '00000000' } }));
     }
  });
}

switchLang('EN');