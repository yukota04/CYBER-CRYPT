import { Language } from './i18n';
import { GameItem } from './types';

export type ItemLocaleStrings = { name: string; description: string };

/** Localized item catalog keyed by baseKey. English falls back to BASE_ITEMS fields. */
export const ITEM_I18N: Record<string, Partial<Record<Language, ItemLocaleStrings>>> = {
  "cyber_tanto": {
    en: { name: "Cyber Tanto", description: "Compact monomolecular cyber-blade with integrated wrist-dart emitter (Range 3)." },
    es: { name: "Tanto Cibernético", description: "Ciberhoja monomolecular compacta con dardo de muñeca integrado (Alcance 3)." },
    fr: { name: "Tanto Cyber", description: "Lame monomoléculaire compacte avec dard de poignet (Portée 3)." },
    de: { name: "Cyber-Tanto", description: "Kompakte monomolekulare Klinge mit Handgelenks-Dart (Reichweite 3)." },
    ja: { name: "サイバー短刀", description: "手首ダーツ付きのコンパクトな単分子ブレード（射程3）。" },
  },
  "katana_neon": {
    en: { name: "Neon Katana", description: "A finely tuned vibro-blade projecting short plasma arcs (Range 2)." },
    es: { name: "Katana de Neón", description: "Vibrocuchilla afinada que proyecta arcos de plasma cortos (Alcance 2)." },
    fr: { name: "Katana Néon", description: "Lame vibro accordée projetant de courts arcs plasma (Portée 2)." },
    de: { name: "Neon-Katana", description: "Fein abgestimmte Vibroklinge mit kurzen Plasma-Bögen (Reichweite 2)." },
    ja: { name: "ネオン刀", description: "短いプラズマ弧を放つ精密バイブロブレード（射程2）。" },
  },
  "twin_phantom_daggers": {
    en: { name: "Twin Phantom Daggers", description: "Dual phase-shifted daggers delivering blistering critical combos (Range 2)." },
    es: { name: "Dagas Fantasma Gemelas", description: "Dagas bifásicas que asestan combos críticos devastadores (Alcance 2)." },
    fr: { name: "Dagues Fantômes Jumelles", description: "Dagues biphasées pour combos critiques dévastateurs (Portée 2)." },
    de: { name: "Zwillings-Phantomdolche", description: "Phasenverschobene Dolche für kritische Combos (Reichweite 2)." },
    ja: { name: "ツインファントムダガー", description: "強烈なクリティカルコンボを放つ位相ダガー（射程2）。" },
  },
  "laser_pistol": {
    en: { name: "Pulse Blaster Pistol", description: "Long-range high frequency laser sidearm firing up to 5 tiles." },
    es: { name: "Pistola Pulse Blaster", description: "Arma lateral láser de alta frecuencia con alcance de hasta 5 casillas." },
    fr: { name: "Pistolet Pulse Blaster", description: "Arme laser longue portée jusqu’à 5 cases." },
    de: { name: "Pulse-Blaster-Pistole", description: "Hochfrequenz-Laser bis zu 5 Felder." },
    ja: { name: "パルスブラスターピストル", description: "最大5マスの高周波レーザーサイドアーム。" },
  },
  "void_katana": {
    en: { name: "Void Horizon Katana", description: "Zero-latency carbon katana slicing targets up to 2 tiles away." },
    es: { name: "Katana Horizonte del Vacío", description: "Katana de carbono de latencia cero que corta objetivos a 2 casillas." },
    fr: { name: "Katana Horizon du Vide", description: "Katana carbone zéro latence tranchant à 2 cases." },
    de: { name: "Void-Horizont-Katana", description: "Null-Latenz-Carbon-Katana, Reichweite 2." },
    ja: { name: "ヴォイドホライズン刀", description: "ゼロレイテンシのカーボン刀（射程2）。" },
  },
  "hyperion_pulse_carbine": {
    en: { name: "Phantom Rail-Carbine", description: "Mythic hyper-velocity precision carbine piercing armored matrices at 5 tiles." },
    es: { name: "Carabina Riel Fantasma", description: "Carabina mítica de hiper-velocidad que perfora matrices blindadas a 5 casillas." },
    fr: { name: "Carabine Rail Fantôme", description: "Carabine mythique hypervéloce perçante à 5 cases." },
    de: { name: "Phantom-Schienenkarabiner", description: "Mythischer Hypergeschwindigkeits-Karabiner, 5 Felder." },
    ja: { name: "ファントムレールカービン", description: "5マスを貫く神話級ハイパーベロシティ銃。" },
  },
  "relic_singularity_blade": {
    en: { name: "Aether Singularity Katana", description: "Ancient alien code fused into a superdense matter katana (Range 3)." },
    es: { name: "Katana Singularidad Aether", description: "Código alienígena antiguo fusionado en una katana de materia superdensa (Alcance 3)." },
    fr: { name: "Katana Singularité Aether", description: "Code alien ancien fusionné en katana supersdense (Portée 3)." },
    de: { name: "Aether-Singularitäts-Katana", description: "Antiker Alien-Code in supersdichter Klinge (Reichweite 3)." },
    ja: { name: "エーテル特異点刀", description: "超高密度物質に融合した古代エイリアンコード（射程3）。" },
  },
  "alloy_sword": {
    en: { name: "Alloy Broadsword", description: "Heavy titanium-carbide blade paired with short kinetic shock reach (Range 2)." },
    es: { name: "Mandoble de Aleación", description: "Hoja pesada de carburo de titanio con alcance cinético corto (Alcance 2)." },
    fr: { name: "Espadon d’Alliage", description: "Lame lourde carbure-titane à portée cinétique courte (Portée 2)." },
    de: { name: "Legierungs-Breitschwert", description: "Schwere Titancarbid-Klinge (Reichweite 2)." },
    ja: { name: "アロイブロードソード", description: "短距離の運動衝撃を伴う重チタンカーバイド刃（射程2）。" },
  },
  "plasma_sword": {
    en: { name: "Hyper-Edge Paladin Sword", description: "One-handed tactical saber projecting a magnetic parry arc (Range 2)." },
    es: { name: "Sable Paladín Hyper-Edge", description: "Sable táctico a una mano con arco magnético de parada (Alcance 2)." },
    fr: { name: "Sabre Paladin Hyper-Edge", description: "Sabre tactique à une main avec arc de parade magnétique (Portée 2)." },
    de: { name: "Hyper-Edge-Paladin-Schwert", description: "Einhandsäbel mit magnetischem Parierbogen (Reichweite 2)." },
    ja: { name: "ハイパーエッジパラディンソード", description: "磁気パリィ弧を放つ片手戦術セイバー（射程2）。" },
  },
  "titan_greatsword": {
    en: { name: "Titan Claymore (Espadón)", description: "Massive two-handed plasma greatsword that cleaves up to 2 tiles away." },
    es: { name: "Claymore Titán (Espadón)", description: "Enorme espadón de plasma a dos manos que corta hasta 2 casillas." },
    fr: { name: "Claymore Titan", description: "Énorme espadon plasma à deux mains (Portée 2)." },
    de: { name: "Titan-Claymore", description: "Massives Zweihand-Plasma-Großschwert (Reichweite 2)." },
    ja: { name: "タイタンクレーモア", description: "最大2マスを薙ぐ両手プラズマ大剣。" },
  },
  "vanguard_rail_lance": {
    en: { name: "Vanguard Rail-Lance", description: "Long-barrel magnetic siege lance striking targets up to 5 tiles away." },
    es: { name: "Lanza Riel de Vanguardia", description: "Lanza de asedio magnética de cañón largo que golpea hasta 5 casillas." },
    fr: { name: "Lance Rail d’Avant-garde", description: "Lance de siège magnétique jusqu’à 5 cases." },
    de: { name: "Vorhut-Schienenlanze", description: "Magnetische Belagerungslanze bis 5 Felder." },
    ja: { name: "ヴァンガードレールランス", description: "最大5マスを突く磁気攻城ランス。" },
  },
  "hyperion_greatsword": {
    en: { name: "Hyperion Dread-Greatsword", description: "Colossal reactor-fed greatsword sweeping up to 3 tiles." },
    es: { name: "Espadón Hyperion Dread", description: "Colosal espadón alimentado por reactor que barre hasta 3 casillas." },
    fr: { name: "Espadon Hyperion Dread", description: "Colossal espadon à réacteur balayant 3 cases." },
    de: { name: "Hyperion-Dread-Großschwert", description: "Kolossales Reaktor-Großschwert, 3 Felder." },
    ja: { name: "ハイペリオン・ドレッド大剣", description: "最大3マスを掃く原子炉駆動の巨大剣。" },
  },
  "aegis_mythic_halberd": {
    en: { name: "Eternal Solar Halberd", description: "Mythic plasma halberd launching seismic beams up to 4 tiles." },
    es: { name: "Alabarda Solar Eterna", description: "Alabarda mítica de plasma que lanza rayos sísmicos hasta 4 casillas." },
    fr: { name: "Hallebarde Solaire Éternelle", description: "Hallebarde plasma mythique jusqu’à 4 cases." },
    de: { name: "Ewige Solar-Hellebarde", description: "Mythische Plasma-Hellebarde bis 4 Felder." },
    ja: { name: "エターナルソーラーハルバード", description: "最大4マスの地震ビームを放つ神話プラズマ戟。" },
  },
  "aegis_kite_shield": {
    en: { name: "Aegis Kite Shield", description: "Reinforced ballistic shield projecting an active kinetic barrier." },
    es: { name: "Escudo Cometa Aegis", description: "Escudo balístico reforzado que proyecta una barrera cinética activa." },
    fr: { name: "Bouclier Comète Aegis", description: "Bouclier balistique projetant une barrière cinétique." },
    de: { name: "Aegis-Drachenschild", description: "Verstärkter ballistischer Schild mit kinetischer Barriere." },
    ja: { name: "イージスカイトシールド", description: "運動障壁を展開する強化弾道シールド。" },
  },
  "bastion_tower_shield": {
    en: { name: "Bastion Bulwark Shield", description: "Heavy reactive tower shield absorbing brutal dungeon shockwaves." },
    es: { name: "Escudo Baluarte Bastión", description: "Torre reactiva pesada que absorbe brutales ondas de choque." },
    fr: { name: "Bouclier Rempart Bastion", description: "Tour réactive absorbant les ondes de choc." },
    de: { name: "Bastion-Bollwerkschild", description: "Schwerer Reaktivturm gegen Schockwellen." },
    ja: { name: "バスティオン防壁盾", description: "衝撃波を吸収する重反応タワーシールド。" },
  },
  "pulse_rod": {
    en: { name: "Pulse Conduit Staff", description: "Arcane-tech staff firing condensed synth-plasma bolts up to 5 tiles." },
    es: { name: "Bastón Conducto de Pulso", description: "Bastón arcano-tech que dispara pernos de sintplasma hasta 5 casillas." },
    fr: { name: "Bâton Conduit de Pulse", description: "Bâton arcano-tech tirant jusqu’à 5 cases." },
    de: { name: "Puls-Leitungsstab", description: "Arkan-Tech-Stab, Bolzen bis 5 Felder." },
    ja: { name: "パルス導管スタッフ", description: "最大5マスのシンプラズマボルトを放つアルケインテック杖。" },
  },
  "arcane_pulse_staff": {
    en: { name: "Arcane Resonance Staff", description: "Twin-coil mage staff amplifying ranged bolts (5 tiles) and capacitor reserves." },
    es: { name: "Bastón Resonancia Arcana", description: "Bastón de doble bobina que amplifica disparos a distancia (5 casillas) y reservas." },
    fr: { name: "Bâton Résonance Arcanique", description: "Bâton double bobine amplifiant les tirs (5 cases)." },
    de: { name: "Arkaner Resonanzstab", description: "Doppelspulen-Magierstab (5 Felder)." },
    ja: { name: "アルケイン共鳴スタッフ", description: "遠距離ボルト（5マス）とエネルギーを増幅する双コイル杖。" },
  },
  "plasma_scythe": {
    en: { name: "Void Weaver Staff", description: "Harvests soul energy across 5 tiles directly from breached monster matrices." },
    es: { name: "Bastón Tejedor del Vacío", description: "Extrae energía de alma a 5 casillas de matrices monstruo vulneradas." },
    fr: { name: "Bâton Tisseur du Vide", description: "Récolte l’énergie d’âme à 5 cases." },
    de: { name: "Void-Weber-Stab", description: "Erntet Seelenenergie auf 5 Feldern." },
    ja: { name: "ヴォイドウィーバースタッフ", description: "5マス先のモンスター行列から魂エネルギーを収穫。" },
  },
  "cyber_railgun": {
    en: { name: "Chronos Singularity Staff", description: "Experimental arcane catalyst firing hyper-velocity bolts across 5 tiles." },
    es: { name: "Bastón Singularidad Chronos", description: "Catalizador experimental que dispara pernos hiperveloces a 5 casillas." },
    fr: { name: "Bâton Singularité Chronos", description: "Catalyseur expérimental hypervéloce à 5 cases." },
    de: { name: "Chronos-Singularitätsstab", description: "Experimenteller Katalysator, 5 Felder." },
    ja: { name: "クロノス特異点スタッフ", description: "5マスを貫く実験的超高速ボルト触媒。" },
  },
  "astral_mythic_staff": {
    en: { name: "Astral Nexus Arch-Staff", description: "Mythic star-forged mage staff projecting lethal plasma lances up to 5 tiles." },
    es: { name: "Archibastón Nexo Astral", description: "Bastón mítico forjado en estrellas que proyecta lanzas de plasma a 5 casillas." },
    fr: { name: "Archibâton Nexus Astral", description: "Bâton mythique projetant des lances plasma à 5 cases." },
    de: { name: "Astral-Nexus-Erzstab", description: "Mythischer Sternenstab, Plasma-Lanzen 5 Felder." },
    ja: { name: "アストラルネクサス大杖", description: "最大5マスのプラズマランスを放つ星鍛の神話杖。" },
  },
  "prism_focus": {
    en: { name: "Quantum Prism Focus", description: "Floating holographic orb that sharpens Technomancer beam refraction." },
    es: { name: "Foco Prisma Cuántico", description: "Orbe holográfico flotante que afila la refracción de rayos del Tecnomante." },
    fr: { name: "Focus Prisme Quantique", description: "Orbe holographique affinant les faisceaux du Technomancien." },
    de: { name: "Quantenprisma-Fokus", description: "Holografische Kugel für Technomancer-Strahlen." },
    ja: { name: "量子プリズムフォーカス", description: "テクノマンサーのビーム屈折を研ぐ浮遊ホロオーブ。" },
  },
  "striker_holo_buckler": {
    en: { name: "Phase Parrying Dagger", description: "Compact offhand blade tuned for swift counter-slashes." },
    es: { name: "Daga de Parada de Fase", description: "Hoja secundaria compacta afinada para contraataques rápidos." },
    fr: { name: "Dague de Parade de Phase", description: "Lame secondaire pour contre-attaques rapides." },
    de: { name: "Phasen-Parierdolch", description: "Kompakte Nebenhandklinge für Konter." },
    ja: { name: "位相パリィダガー", description: "素早いカウンター用のコンパクト副武装。" },
  },
  "recon_visor": {
    en: { name: "Tactical Recon Visor", description: "HUD-linked helmet visor improving target acquisition and cranial armor." },
    es: { name: "Visor Táctico de Reconocimiento", description: "Visor HUD que mejora adquisición de blancos y armadura craneal." },
    fr: { name: "Viseur Tactique Recon", description: "Visière HUD améliorant acquisition et protection crânienne." },
    de: { name: "Taktisches Aufklärungsvisier", description: "HUD-Visier für Zielerfassung und Kopfschutz." },
    ja: { name: "戦術偵察バイザー", description: "目標捕捉と頭部装甲を強化するHUDバイザー。" },
  },
  "titanium_helm": {
    en: { name: "Bastion Assault Helm", description: "Layered composite helmet built to withstand blunt impact." },
    es: { name: "Casco de Asalto Bastión", description: "Casco compuesto en capas diseñado para impactos contundentes." },
    fr: { name: "Casque d’Assaut Bastion", description: "Casque composite contre les impacts contondants." },
    de: { name: "Bastion-Sturmhelm", description: "Geschichteter Komposithelm gegen Wucht." },
    ja: { name: "バスティオン突撃ヘルム", description: "打撃に耐える複合ヘルメット。" },
  },
  "arcane_crown": {
    en: { name: "Neural Diadem Crown", description: "Synaptic circlet boosting combat cognition and energy flow." },
    es: { name: "Corona Diadema Neural", description: "Circuito sináptico que potencia cognición de combate y flujo de energía." },
    fr: { name: "Couronne Diadème Neural", description: "Circlet synaptique boostant cognition et énergie." },
    de: { name: "Neuronale Diademkrone", description: "Synaptischer Reif für Kampfkognition und Energie." },
    ja: { name: "ニューラルダイアデム", description: "戦闘認知とエネルギー流を高めるシナプス冠。" },
  },
  "cyber_vest": {
    en: { name: "Kevlar Mesh Vest", description: "Standard operative chestplate woven with ballistic carbon fibers." },
    es: { name: "Chaleco de Malla Kevlar", description: "Pechera estándar tejida con fibras de carbono balísticas." },
    fr: { name: "Gilet Mesh Kevlar", description: "Plastron standard en fibres de carbone balistiques." },
    de: { name: "Kevlar-Mesh-Weste", description: "Standard-Brustplatte aus ballistischem Carbon." },
    ja: { name: "ケブラーメッシュベスト", description: "弾道カーボン繊維の標準胸部装甲。" },
  },
  "chitin_carapace": {
    en: { name: "Exo-Polymer Carapace", description: "Lightweight reactive chest armor plating that absorbs shockwaves." },
    es: { name: "Caparazón Exo-Polímero", description: "Pechera reactiva ligera que absorbe ondas de choque." },
    fr: { name: "Carapace Exo-Polymère", description: "Plastron réactif absorbant les ondes de choc." },
    de: { name: "Exo-Polymer-Panzer", description: "Leichte reaktive Brustplatte gegen Schockwellen." },
    ja: { name: "エキソポリマー甲羅", description: "衝撃波を吸収する軽量反応胸部装甲。" },
  },
  "aegis_nanosuit": {
    en: { name: "Nanite Battle Harness", description: "Active micro-servos continuously seal breaches and reinforce vital circuits." },
    es: { name: "Arnés de Batalla Nanita", description: "Microservos activos que sellan brechas y refuerzan circuitos vitales." },
    fr: { name: "Harnais de Combat Nanite", description: "Micro-servos scellant les brèches vitales." },
    de: { name: "Naniten-Kampfgeschirr", description: "Mikroservos versiegeln Breschen und verstärken Kreisläufe." },
    ja: { name: "ナノナイト戦闘ハーネス", description: "裂け目を封じ回路を強化するマイクロサーボ。" },
  },
  "hyperion_chassis": {
    en: { name: "Hyperion Bastion Chassis", description: "Military heavy dreadnought chestplate impenetrable to conventional rounds." },
    es: { name: "Chasis Bastión Hyperion", description: "Pechera militar de dreadnought impenetrable a proyectiles convencionales." },
    fr: { name: "Châssis Bastion Hyperion", description: "Plastron dreadnought militaire." },
    de: { name: "Hyperion-Bastion-Chassis", description: "Militärische Dreadnought-Brustplatte." },
    ja: { name: "ハイペリオン・バスティオン筐体", description: "通常弾を通さない軍用ドレッドノート胸甲。" },
  },
  "tactical_grips": {
    en: { name: "Carbon Combat Gloves", description: "Micro-textured tactical gloves stabilizing weapon recoil and grip." },
    es: { name: "Guantes de Combate de Carbono", description: "Guantes tácticos microtexturizados que estabilizan el retroceso." },
    fr: { name: "Gants de Combat Carbone", description: "Gants micro-texturés stabilisant le recul." },
    de: { name: "Carbon-Kampfhandschuhe", description: "Mikrotexturierte Handschuhe gegen Rückstoß." },
    ja: { name: "カーボン戦闘グローブ", description: "反動を抑える微細テクスチャ手袋。" },
  },
  "kinetic_gauntlets": {
    en: { name: "Kinetic Pulse Gauntlets", description: "Servo-assisted gauntlets amplifying melee impact velocity." },
    es: { name: "Guanteletes de Pulso Cinético", description: "Guanteletes asistidos por servos que amplifican la velocidad de impacto." },
    fr: { name: "Gantelets Pulse Cinétique", description: "Gantelets servo amplifiant l’impact." },
    de: { name: "Kinetik-Puls-Stulpen", description: "Servo-Stulpen für höhere Aufprallgeschwindigkeit." },
    ja: { name: "キネティックパルスガントレット", description: "打撃速度を増すサーボ支援籠手。" },
  },
  "synth_handwraps": {
    en: { name: "Quantum Weaver Gauntlets", description: "Nanofiber handwear accelerating spell triggers and critical strikes." },
    es: { name: "Guanteletes Tejedor Cuántico", description: "Guantes de nanofibra que aceleran hechizos y críticos." },
    fr: { name: "Gantelets Tisseur Quantique", description: "Nanofibres accélérant sorts et critiques." },
    de: { name: "Quantenweber-Stulpen", description: "Nanofaser beschleunigt Zauber und Krits." },
    ja: { name: "量子織りガントレット", description: "呪文発動とクリティカルを加速するナノファイバー。" },
  },
  "exo_trousers": {
    en: { name: "Reinforced Exo-Pants", description: "Articulated tactical legwear lined with flexible Kevlar pads." },
    es: { name: "Pantalones Exo Reforzados", description: "Pantalón táctico articulado con pads flexibles de Kevlar." },
    fr: { name: "Pantalon Exo Renforcé", description: "Jambières tactiques articulées en Kevlar." },
    de: { name: "Verstärkte Exo-Hose", description: "Gelenkige taktische Beinbekleidung mit Kevlar." },
    ja: { name: "強化エキソパンツ", description: "柔軟ケブラーパッド付き関節戦術脚装。" },
  },
  "carbon_greaves": {
    en: { name: "Carbon Stride Greaves", description: "Powered leg armor enhancing stance stability under heavy assault." },
    es: { name: "Grebas Carbon Stride", description: "Armadura de piernas potenciada que mejora la estabilidad bajo asalto." },
    fr: { name: "Jambières Carbon Stride", description: "Armure de jambes pour stabilité sous assaut." },
    de: { name: "Carbon-Stride-Beinschienen", description: "Beinrüstung für Stabilität unter Beschuss." },
    ja: { name: "カーボンストライドグリーブ", description: "強襲下の姿勢安定を高める動力脚甲。" },
  },
  "titan_legplates": {
    en: { name: "Titan Hydraulic Legplates", description: "Heavy servo-driven leg armor converting kinetic hits into counter power." },
    es: { name: "Placas Hidráulicas Titán", description: "Armadura pesada de piernas que convierte impactos en potencia de contraataque." },
    fr: { name: "Plaques Hydrauliques Titan", description: "Convertit les impacts en puissance de riposte." },
    de: { name: "Titan-Hydraulik-Beinplatten", description: "Wandelt Treffer in Gegenkraft um." },
    ja: { name: "タイタン油圧レッグプレート", description: "衝撃を反撃力へ変換する重サーボ脚甲。" },
  },
  "mag_boots": {
    en: { name: "Mag-Grip Combat Boots", description: "Magnetic-soled boots providing solid footing across slick grid floors." },
    es: { name: "Botas Mag-Grip de Combate", description: "Botas de suela magnética para agarre firme en suelos resbaladizos." },
    fr: { name: "Bottes Mag-Grip", description: "Semelles magnétiques pour adhérence maximale." },
    de: { name: "Mag-Grip-Kampfstiefel", description: "Magnetsohlen für festen Halt." },
    ja: { name: "マググリップ戦闘ブーツ", description: "滑る床でも踏ん張る磁力ソール。" },
  },
  "strider_thrusters": {
    en: { name: "Strider Jet-Boots", description: "Micro-thruster boots improving dodge agility and critical lunges." },
    es: { name: "Botas Jet Strider", description: "Botas con micropropulsores que mejoran esquiva y embestidas críticas." },
    fr: { name: "Bottes Jet Strider", description: "Micro-propulseurs pour esquive et charges critiques." },
    de: { name: "Strider-Jet-Stiefel", description: "Mikroschub für Ausweichen und kritische Stöße." },
    ja: { name: "ストライダー・ジェットブーツ", description: "回避とクリティカル突進を高めるマイクロスラスター。" },
  },
  "void_sabatons": {
    en: { name: "Void-Step Sabatons", description: "Gravity-dampened boots engineered for deep cyber-crypt expeditions." },
    es: { name: "Escarpines Paso del Vacío", description: "Botas con amortiguación gravitatoria para expediciones profundas." },
    fr: { name: "Sabatons Pas du Vide", description: "Amortissement gravitationnel pour expéditions profondes." },
    de: { name: "Void-Step-Sabatons", description: "Gravitationsgedämpfte Stiefel für tiefe Expeditionen." },
    ja: { name: "ヴォイドステップサバトン", description: "深層遠征向け重力減衰ブーツ。" },
  },
  "neural_chip": {
    en: { name: "Overclock Signet Ring", description: "Compact biometric ring accelerating synaptic impulse speeds." },
    es: { name: "Anillo Signet Overclock", description: "Anillo biométrico compacto que acelera impulsos sinápticos." },
    fr: { name: "Anneau Signet Overclock", description: "Anneau biométrique accélérant les impulsions." },
    de: { name: "Overclock-Siegelring", description: "Biometrischer Ring beschleunigt Impulse." },
    ja: { name: "オーバークロック印章リング", description: "シナプス衝動を加速する生体計測リング。" },
  },
  "quantum_pendant": {
    en: { name: "Phase Displacement Ring", description: "Micro-gravitational ring allowing partial atomic deflection." },
    es: { name: "Anillo Desplazamiento de Fase", description: "Anillo microgravitatorio que permite deflexión atómica parcial." },
    fr: { name: "Anneau Déplacement de Phase", description: "Déflexion atomique partielle." },
    de: { name: "Phasenverschiebungsring", description: "Teilweise atomare Ablenkung." },
    ja: { name: "位相変位リング", description: "部分的な原子偏向を可能にする微小重力リング。" },
  },
  "matrix_core": {
    en: { name: "Sub-Zero Cryo Band", description: "Superconducting thermal ring boosting overall system power output." },
    es: { name: "Banda Crio Sub-Zero", description: "Anillo térmico superconductor que aumenta la potencia del sistema." },
    fr: { name: "Bague Cryo Sub-Zero", description: "Anneau supra-conducteur boostant la puissance." },
    de: { name: "Sub-Zero-Kryoband", description: "Supraleitender Ring für Systemleistung." },
    ja: { name: "サブゼロ・クライオバンド", description: "システム出力を高める超伝導熱リング。" },
  },
  "crimson_signet": {
    en: { name: "Crimson Singularity Ring", description: "Forged from core synthesizer alloys, amplifying lethal precision." },
    es: { name: "Anillo Singularidad Carmesí", description: "Forjado con aleaciones de núcleo, amplifica la precisión letal." },
    fr: { name: "Anneau Singularité Crimson", description: "Alliages de noyau amplifiant la précision létale." },
    de: { name: "Purpur-Singularitätsring", description: "Kernlegierungen für tödliche Präzision." },
    ja: { name: "クリムゾン特異点リング", description: "コア合金製で致死精度を増幅。" },
  },
  "synapse_studs": {
    en: { name: "Synapse Telemetry Studs", description: "Sub-dermal audio-neural earrings sharpening tactical focus." },
    es: { name: "Pendientes Telemetría Sinapsis", description: "Pendientes audio-neurales que afilan el foco táctico." },
    fr: { name: "Boucles Télémétrie Synapse", description: "Boucles audio-neurales affinant le focus." },
    de: { name: "Synapse-Telemetrie-Ohrstecker", description: "Audio-neuronale Ohrstecker für Fokus." },
    ja: { name: "シナプステレメトリスタッド", description: "戦術集中を研ぐ聴覚神経ピアス。" },
  },
  "ether_drops": {
    en: { name: "Aether Wave Earrings", description: "Harmonic crystal earrings resonating with dungeon energy currents." },
    es: { name: "Pendientes Onda Aether", description: "Pendientes de cristal armónico que resuenan con la energía de la mazmorra." },
    fr: { name: "Boucles Onde Aether", description: "Cristaux harmoniques résonnant avec le donjon." },
    de: { name: "Aether-Wellen-Ohrringe", description: "Harmonische Kristalle resonieren mit dem Dungeon." },
    ja: { name: "エーテル波イヤリング", description: "ダンジョンエネルギーと共鳴する調和結晶。" },
  },
  "cyber_ear_cuffs": {
    en: { name: "Neural Overdrive Cuffs", description: "High-bandwidth optic ear cuffs maximizing critical targeting and vigor." },
    es: { name: "Aros Overdrive Neural", description: "Aros ópticos de alto ancho de banda para críticos y vigor." },
    fr: { name: "Manchons Overdrive Neural", description: "Haut débit pour critiques et vigueur." },
    de: { name: "Neural-Overdrive-Manschetten", description: "Hohe Bandbreite für Krits und Vitalität." },
    ja: { name: "ニューラルオーバードライブカフ", description: "クリティカルと活力を最大化する高帯域イヤーカフ。" },
  },
  "mythic_astral_robe": {
    en: { name: "Solaris Mythic Exo-Mantle", description: "Mythic starlight-woven armor plating channeling extreme energy and durability." },
    es: { name: "Exo-Manto Mítico Solaris", description: "Armadura mítica tejida con luz estelar de extrema energía y durabilidad." },
    fr: { name: "Exo-Manteau Mythique Solaris", description: "Armure mythique d’énergie et durabilité extrêmes." },
    de: { name: "Solaris Mythischer Exo-Mantel", description: "Sternenlicht-Rüstung mit extremer Energie und Haltbarkeit." },
    ja: { name: "ソラリス神話エキソマント", description: "極限のエネルギーと耐久を宿す星光織装甲。" },
  },
  "mythic_chronos_ring": {
    en: { name: "Eternity Chronos Band", description: "Mythic temporal ring amplifying critical strikes and synaptic power." },
    es: { name: "Banda Chronos de Eternidad", description: "Anillo temporal mítico que amplifica críticos y potencia sináptica." },
    fr: { name: "Bague Chronos d’Éternité", description: "Anneau temporel amplifiant critiques et puissance." },
    de: { name: "Ewigkeits-Chronos-Band", description: "Temporaler Ring für Krits und synaptische Kraft." },
    ja: { name: "永遠クロノスバンド", description: "クリティカルとシナプス出力を増す神話時間リング。" },
  },
  "stim_pack": {
    en: { name: "Nanite Med-Stim", description: "Instant tissue re-synthesizer restoring 50 HP." },
    es: { name: "Med-Stim de Nanitas", description: "Resintetizador de tejido instantáneo que restaura 50 HP." },
    fr: { name: "Med-Stim Nanite", description: "Resynthétiseur instantané restaurant 50 PV." },
    de: { name: "Naniten-Med-Stim", description: "Sofortige Gewebe-Resynthese: 50 TP." },
    ja: { name: "ナノナイト・メッドスティム", description: "組織を即再合成しHPを50回復。" },
  },
  "super_stim": {
    en: { name: "Hyper-Regen Syringe", description: "High-grade military coagulant restoring 130 HP." },
    es: { name: "Jeringa Hyper-Regen", description: "Coagulante militar de alto grado que restaura 130 HP." },
    fr: { name: "Seringue Hyper-Regen", description: "Coagulant militaire restaurant 130 PV." },
    de: { name: "Hyper-Regen-Spritze", description: "Militärisches Koagulans: 130 TP." },
    ja: { name: "ハイパーリジェンスリンジ", description: "軍用凝固剤でHPを130回復。" },
  },
  "omega_medkit": {
    en: { name: "Omega Cellular Gel", description: "Apex trauma reconstructor restoring 260 HP immediately." },
    es: { name: "Gel Celular Omega", description: "Reconstructor de trauma apex que restaura 260 HP al instante." },
    fr: { name: "Gel Cellulaire Omega", description: "Reconstructeur apex restaurant 260 PV." },
    de: { name: "Omega-Zellgel", description: "Apex-Trauma-Rekonstruktor: 260 TP." },
    ja: { name: "オメガ細胞ゲル", description: "頂点の外傷再構築で即時HP260回復。" },
  },
  "energy_cell": {
    en: { name: "Plasma Battery", description: "Refills 40 points of operational energy." },
    es: { name: "Batería de Plasma", description: "Recarga 40 puntos de energía operativa." },
    fr: { name: "Batterie Plasma", description: "Recharge 40 points d’énergie." },
    de: { name: "Plasma-Batterie", description: "Lädt 40 Energie auf." },
    ja: { name: "プラズマバッテリー", description: "運用エネルギーを40回復。" },
  },
  "hyper_cell": {
    en: { name: "Tachyon Capacitor", description: "Supercharged reactor cell restoring 95 Energy." },
    es: { name: "Capacitor de Taquiones", description: "Celda de reactor sobrecargada que restaura 95 de Energía." },
    fr: { name: "Condensateur Tachyon", description: "Cellule surchargée restaurant 95 Énergie." },
    de: { name: "Tachyon-Kondensator", description: "Überladene Zelle: 95 Energie." },
    ja: { name: "タキオンキャパシタ", description: "過充電リアクターセルでエネルギー95回復。" },
  },
  "dual_elixir": {
    en: { name: "Synthwave Vitality Elixir", description: "Dual bio-capacitor potion restoring 85 HP and 50 Energy." },
    es: { name: "Elixir de Vitalidad Synthwave", description: "Poción dual que restaura 85 HP y 50 de Energía." },
    fr: { name: "Élixir Vitalité Synthwave", description: "Potion duale : 85 PV et 50 Énergie." },
    de: { name: "Synthwave-Vitalitätselixier", description: "Duale Trankwirkung: 85 TP und 50 Energie." },
    ja: { name: "シンセウェイブ活力エリクサー", description: "HP85とエネルギー50を回復する双能ポーション。" },
  },
  "omni_serum": {
    en: { name: "Quantum Core Elixir", description: "Masterwork dual tonic restoring 190 HP and 110 Energy." },
    es: { name: "Elixir Núcleo Cuántico", description: "Tónico dual maestro que restaura 190 HP y 110 de Energía." },
    fr: { name: "Élixir Noyau Quantique", description: "Tonique maître : 190 PV et 110 Énergie." },
    de: { name: "Quantenkern-Elixier", description: "Meistertonikum: 190 TP und 110 Energie." },
    ja: { name: "量子コアエリクサー", description: "HP190とエネルギー110を回復する達人トニック。" },
  },
  "regen_serum": {
    en: { name: "Bio-Mesh Regen Potion", description: "Sustained nanite infusion regenerating +15 HP & +8 Energy per turn for 6 turns." },
    es: { name: "Poción Regen Bio-Mesh", description: "Infusión sostenida: +15 HP y +8 Energía por turno durante 6 turnos." },
    fr: { name: "Potion Regen Bio-Mesh", description: "+15 PV & +8 Énergie/tour pendant 6 tours." },
    de: { name: "Bio-Mesh-Regen-Trank", description: "+15 TP & +8 Energie/Zug für 6 Züge." },
    ja: { name: "バイオメッシュ・リジェン薬", description: "6ターンの間、毎ターンHP+15＆エネルギー+8。" },
  },
  "grand_regen_serum": {
    en: { name: "Chrono-Regen Infusion", description: "Extended nanite stream regenerating +30 HP & +14 Energy per turn for 8 turns." },
    es: { name: "Infusión Chrono-Regen", description: "Flujo de nanitas: +30 HP y +14 Energía por turno durante 8 turnos." },
    fr: { name: "Infusion Chrono-Regen", description: "+30 PV & +14 Énergie/tour pendant 8 tours." },
    de: { name: "Chrono-Regen-Infusion", description: "+30 TP & +14 Energie/Zug für 8 Züge." },
    ja: { name: "クロノリジェン注入", description: "8ターンの間、毎ターンHP+30＆エネルギー+14。" },
  },
  "igneous_potion": {
    en: { name: "Igneous Thermite Potion", description: "Detonates a volatile fire wave (4-tile radius) burning nearby enemies for 5 turns." },
    es: { name: "Poción Termita Ígnea", description: "Detona una ola de fuego (radio 4) que quema enemigos durante 5 turnos." },
    fr: { name: "Potion Thermite Ignée", description: "Vague de feu (rayon 4) brûlant 5 tours." },
    de: { name: "Ignis-Thermite-Trank", description: "Feuerwelle (Radius 4) brennt 5 Züge." },
    ja: { name: "イグニアス・サーミット薬", description: "半径4の炎波を起爆し5ターン燃焼。" },
  },
  "inferno_potion": {
    en: { name: "Solar Inferno Flask", description: "Cataclysmic plasma-fire potion scorching enemies in a 6-tile radius for 6 turns." },
    es: { name: "Frasco Inferno Solar", description: "Poción cataclísmica que quema enemigos en radio 6 durante 6 turnos." },
    fr: { name: "Flasque Inferno Solaire", description: "Plasma-feu rayon 6 pendant 6 tours." },
    de: { name: "Solar-Inferno-Flasche", description: "Plasmafeuer Radius 6 für 6 Züge." },
    ja: { name: "ソーラーインフェルノフラスコ", description: "半径6を6ターン炎上させる破局ポーション。" },
  },
  "aegis_tonic": {
    en: { name: "Aegis Kinetic Tonic", description: "Projects a reinforced +75 Kinetic Shield barrier around your operative." },
    es: { name: "Tónico Cinético Aegis", description: "Proyecta una barrera de Escudo Cinético +75 alrededor del operativo." },
    fr: { name: "Tonique Cinétique Aegis", description: "Bouclier Cinétique +75." },
    de: { name: "Aegis-Kinetik-Tonikum", description: "+75 Kinetikschild." },
    ja: { name: "イージス運動トニック", description: "運動シールド+75を展開。" },
  },
  "berserk_vial": {
    en: { name: "Synapse Cooldown Vial", description: "Purges all active skill cooldowns instantly and restores 30 Energy." },
    es: { name: "Vial de Reinicio de Sinapsis", description: "Purga todos los cooldowns de skills al instante y restaura 30 de Energía." },
    fr: { name: "Fiole Reset Synapse", description: "Réinitialise tous les cooldowns et +30 Énergie." },
    de: { name: "Synapse-Cooldown-Phiole", description: "Setzt alle Skill-Cooldowns zurück und +30 Energie." },
    ja: { name: "シナプスクールダウンバイアル", description: "全スキルのクールダウンを即解除しエネルギー30回復。" },
  },
  "overclock_serum": {
    en: { name: "Overclock Elixir", description: "Grants temporary cyber overload (+10 Attack & 100% Crit for 4 turns)." },
    es: { name: "Elixir Overclock", description: "Sobrecarga temporal (+10 ATK y 100% crítico durante 4 turnos)." },
    fr: { name: "Élixir Overclock", description: "+10 ATK & 100% critique pendant 4 tours." },
    de: { name: "Overclock-Elixier", description: "+10 ANG & 100% Krit für 4 Züge." },
    ja: { name: "オーバークロックエリクサー", description: "4ターンの間、攻撃+10＆クリティカル100%。" },
  },
  "teleport_scroll": {
    en: { name: "Quantum Warp Capsule", description: "Emergency escape beacon that warps you to a safe distant tile." },
    es: { name: "Cápsula Warp Cuántica", description: "Baliza de escape de emergencia que te teletransporta a una casilla segura." },
    fr: { name: "Capsule Warp Quantique", description: "Téléportation d’urgence vers une case sûre." },
    de: { name: "Quanten-Warp-Kapsel", description: "Notfall-Teleport auf ein sicheres Feld." },
    ja: { name: "量子ワープカプセル", description: "安全な遠方マスへ緊急転移。" },
  },
  "probability_stone": {
    en: { name: "Probability Stone (+60%)", description: "Insert into the Forge upgrade slot to boost success rate by +60% (40%+ becomes 100% safe!)." },
    es: { name: "Piedra de Probabilidad (+60%)", description: "Insértala en la forja para subir la tasa de éxito +60% (40%+ se vuelve 100% seguro)." },
    fr: { name: "Pierre de Probabilité (+60%)", description: "Insérez-la dans la forge pour +60% de réussite." },
    de: { name: "Wahrscheinlichkeitsstein (+60%)", description: "In die Schmiede einsetzen für +60% Erfolgschance." },
    ja: { name: "確率の石（+60%）", description: "鍛冶スロットに装着して成功率+60%。" },
  },
  "shop_plasma_katana": {
    en: { name: "Plasma Arc Katana", description: "Superheated energy blade engineered for slicing rogue mainframe cores." },
    es: { name: "Katana Arco de Plasma", description: "Hoja de energía sobrecalentada para cortar núcleos de mainframe rebeldes." },
    fr: { name: "Katana Arc Plasma", description: "Lame d’énergie surchauffée pour trancher les cœurs de mainframe." },
    de: { name: "Plasma-Bogen-Katana", description: "Überhitzte Energieklinge zum Zerteilen von Mainframe-Kernen." },
    ja: { name: "プラズマアーク刀", description: "暴走メインフレーム核を斬る過熱エネルギー刃。" },
  },
  "shop_void_katana": {
    en: { name: "Void-Edge Plasma Katana", description: "Superheated energy blade engineered for slicing rogue mainframe cores." },
    es: { name: "Katana Plasma Filo del Vacío", description: "Hoja de energía sobrecalentada para cortar núcleos de mainframe rebeldes." },
    fr: { name: "Katana Plasma Tranchant du Vide", description: "Lame d’énergie surchauffée pour trancher les cœurs de mainframe." },
    de: { name: "Void-Edge-Plasma-Katana", description: "Überhitzte Energieklinge zum Zerteilen von Mainframe-Kernen." },
    ja: { name: "ヴォイドエッジ・プラズマ刀", description: "暴走メインフレーム核を斬る過熱エネルギー刃。" },
  },
  "shop_aegis_armor": {
    en: { name: "Aegis Carbon Nano-Weave", description: "Hardened graphene composite armor with built-in kinetic dissipators." },
    es: { name: "Nano-tejido de Carbono Aegis", description: "Armadura de grafeno endurecido con disipadores cinéticos integrados." },
    fr: { name: "Nano-tissage Carbone Aegis", description: "Armure graphène durcie avec dissipateurs cinétiques." },
    de: { name: "Aegis Carbon-Nanogewebe", description: "Gehärtete Graphenrüstung mit kinetischen Ableitern." },
    ja: { name: "イージス・カーボンナノ織", description: "運動散逸器付き硬化グラフェン複合装甲。" },
  },
};

function stripDynamicSuffixes(name: string): string {
  return name
    .replace(/\s\+\d+$/, '')
    .replace(/\s*\[Lv\.\d+\]/g, '')
    .trim();
}

const ROLE_LABEL: Record<Language, Record<string, string>> = {
  en: { striker: 'Striker', technomancer: 'Technomancer', vanguard: 'Vanguard', shared: 'Ops' },
  es: { striker: 'Striker', technomancer: 'Tecnómancer', vanguard: 'Vanguard', shared: 'Ops' },
  fr: { striker: 'Striker', technomancer: 'Technomancien', vanguard: 'Vanguard', shared: 'Ops' },
  de: { striker: 'Striker', technomancer: 'Technomancer', vanguard: 'Vanguard', shared: 'Ops' },
  ja: { striker: 'ストライカー', technomancer: 'テクノマンサー', vanguard: 'ヴァンガード', shared: '作戦' }
};

const SLOT_LABEL: Record<Language, Record<string, string>> = {
  en: {
    weapon: 'Weapon',
    offhand: 'Off-hand',
    helmet: 'Helm',
    chest: 'Chest',
    gloves: 'Gloves',
    legs: 'Legs',
    boots: 'Boots',
    ring: 'Ring',
    earrings: 'Earrings',
    consumable: 'Consumable'
  },
  es: {
    weapon: 'Arma',
    offhand: 'Secundaria',
    helmet: 'Casco',
    chest: 'Pechera',
    gloves: 'Guantes',
    legs: 'Pantalones',
    boots: 'Botas',
    ring: 'Anillo',
    earrings: 'Pendientes',
    consumable: 'Consumible'
  },
  fr: {
    weapon: 'Arme',
    offhand: 'Main secondaire',
    helmet: 'Casque',
    chest: 'Plastron',
    gloves: 'Gants',
    legs: 'Jambières',
    boots: 'Bottes',
    ring: 'Anneau',
    earrings: 'Boucles',
    consumable: 'Consommable'
  },
  de: {
    weapon: 'Waffe',
    offhand: 'Nebenhand',
    helmet: 'Helm',
    chest: 'Brust',
    gloves: 'Handschuhe',
    legs: 'Beine',
    boots: 'Stiefel',
    ring: 'Ring',
    earrings: 'Ohrringe',
    consumable: 'Verbrauchsgut'
  },
  ja: {
    weapon: '武器',
    offhand: '副装備',
    helmet: '兜',
    chest: '胴',
    gloves: '手袋',
    legs: '脚',
    boots: '靴',
    ring: '指輪',
    earrings: '耳飾り',
    consumable: '消耗品'
  }
};

const DESC_TMPL: Record<Language, string> = {
  en: 'Mk-{n} {role} {slot} forged for deep-crypt pressure.',
  es: '{slot} {role} Mk-{n} forjada para la presión de pisos profundos.',
  fr: '{slot} {role} Mk-{n} forgé(e) pour la pression des étages profonds.',
  de: '{role}-{slot} Mk-{n} für tiefen Crypt-Druck geschmiedet.',
  ja: '深層フロア向けの{role}{slot} Mk-{n}。'
};

function localizeGeneratedKey(key: string, language: Language, fallbackName: string): {
  name: string;
  description: string;
} | null {
  // gen_striker_weapon_07 | gen_shared_ring_05 | gen_shared_consumable_16
  const m = /^gen_([a-z]+)_([a-z]+)_(\d+)$/.exec(key);
  if (!m) return null;
  const role = m[1];
  const slot = m[2];
  const n = String(Number(m[3]) + 1).padStart(2, '0');
  const roleLabel = ROLE_LABEL[language][role] || role;
  const slotLabel = SLOT_LABEL[language][slot] || slot;
  // Prefer unique English base name for identity; prefix with localized role/slot tag
  const name =
    language === 'en'
      ? fallbackName
      : `${fallbackName} · ${roleLabel} ${slotLabel}`;
  const description = DESC_TMPL[language]
    .replace('{n}', n)
    .replace('{role}', roleLabel)
    .replace('{slot}', slotLabel);
  return { name, description };
}

export function getLocalizedItemName(
  item: GameItem,
  language: Language,
  opts: { includeLevel?: boolean; includeUpgrade?: boolean } = {}
): string {
  const includeLevel = opts.includeLevel !== false;
  const includeUpgrade = opts.includeUpgrade !== false;
  const key = item.baseKey;
  const localized = key ? ITEM_I18N[key]?.[language]?.name : undefined;
  const generated = key && !localized ? localizeGeneratedKey(key, language, stripDynamicSuffixes(item.name)) : null;
  let base = localized || generated?.name || stripDynamicSuffixes(item.name) || item.name;
  if (includeLevel && item.itemLevel && item.itemLevel > 1) base = `${base} [Lv.${item.itemLevel}]`;
  if (includeUpgrade && item.upgradeLevel && item.upgradeLevel > 0) base = `${base} +${item.upgradeLevel}`;
  return base;
}

export function getLocalizedItemDescription(item: GameItem, language: Language): string {
  const key = item.baseKey;
  if (key && ITEM_I18N[key]?.[language]?.description) return ITEM_I18N[key]![language]!.description;
  if (key) {
    const generated = localizeGeneratedKey(key, language, stripDynamicSuffixes(item.name));
    if (generated) return generated.description;
  }
  return item.description;
}
