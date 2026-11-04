/*
 * Animaciones propias de los ejercicios: una figura de palitos dibujada en SVG
 * que se mueve entre dos o más posturas. Hecho a mano, sin archivos externos,
 * así que funciona sin internet y no tiene problemas de derechos.
 *
 * Cada postura es un conjunto de puntos en un cuadro de 100 x 100 (suelo en y = 90):
 *   h cabeza, s hombros, e/w codo y mano, e2/w2 el otro brazo,
 *   p cadera, k/f rodilla y pie, k2/f2 la otra pierna.
 */
const Anim = (() => {
  const STAND = { h: [50, 20], s: [50, 30], e: [50, 42], w: [51, 53], p: [50, 55], k: [50, 72], f: [50, 89] };
  // pose(): postura parcial; full(): completa (si no se dice nada del otro brazo/pierna, va junto al primero)
  const pose = o => Object.assign({}, o);
  const full = o => {
    const q = Object.assign({}, STAND, o);
    q.e2 = q.e2 || q.e; q.w2 = q.w2 || q.w; q.k2 = q.k2 || q.k; q.f2 = q.f2 || q.f;
    return q;
  };
  const shift = (o, dy) => Object.fromEntries(Object.entries(full(o)).map(([k, [x, y]]) => [k, [x, y + dy]]));
  const mirror = o => Object.fromEntries(Object.entries(full(o)).map(([k, [x, y]]) => [k, [100 - x, y]]));

  // ----- Posturas reutilizables -----
  const stand = pose({});
  const squat = pose({ p: [42, 70], k: [58, 74], s: [52, 47], h: [55, 38], e: [63, 47], w: [74, 46] });
  const armsUp = pose({ e: [52, 18], w: [53, 7] });
  const plankHigh = pose({ w: [30, 89], e: [30, 79], s: [30, 69], h: [23, 65], p: [58, 75], k: [73, 81], f: [88, 88] });
  const pushDown = pose({ w: [30, 89], e: [40, 82], s: [30, 81], h: [22, 78], p: [58, 84], k: [73, 86], f: [88, 88] });
  const lungeDown = pose({ f: [64, 89], k: [64, 72], p: [48, 73], k2: [40, 88], f2: [24, 88], s: [48, 48], h: [48, 38], e: [49, 60], w: [49, 71] });
  const supine = pose({ h: [14, 84], s: [22, 86], e: [32, 88], w: [42, 89], p: [50, 88], k: [64, 74], f: [74, 89] });
  const prone = pose({ h: [16, 84], s: [24, 87], e: [14, 88], w: [4, 88], p: [52, 88], k: [70, 88], f: [88, 88] });
  const quad = pose({ w: [30, 89], e: [30, 79], s: [30, 70], h: [23, 66], p: [58, 70], k: [58, 88], f: [76, 89] });
  const hang = pose({ w: [50, 9], e: [50, 18], s: [50, 27], h: [54, 20], p: [50, 52], k: [50, 69], f: [51, 86] });
  const hinge = pose({ p: [60, 55], s: [38, 46], h: [32, 42], e: [38, 56], w: [39, 67], k: [55, 72], f: [52, 89] });
  const bentRowDown = pose({ h: [30, 40], s: [36, 44], p: [58, 56], k: [60, 72], f: [58, 89], e: [36, 54], w: [36, 64] });
  const bentRowUp = pose(Object.assign({}, bentRowDown, { e: [46, 42], w: [45, 53] }));
  const seated = { p: [40, 86], s: [40, 62], h: [42, 53], k: [58, 87], f: [76, 88] };
  const jackClosed = pose({ h: [50, 20], s: [50, 30], e: [44, 42], w: [42, 54], e2: [56, 42], w2: [58, 54], p: [50, 55], k: [47, 72], f: [46, 89], k2: [53, 72], f2: [54, 89] });
  const jackOpen = pose({ h: [50, 18], s: [50, 28], e: [40, 20], w: [34, 10], e2: [60, 20], w2: [66, 10], p: [50, 53], k: [42, 70], f: [36, 88], k2: [58, 70], f2: [64, 88] });
  const runA = pose({ k: [62, 62], f: [58, 78], k2: [50, 72], f2: [48, 89], e: [56, 40], w: [62, 33], e2: [44, 42], w2: [40, 51] });
  const runB = pose({ k2: [62, 62], f2: [58, 78], k: [50, 72], f: [48, 89], e2: [56, 40], w2: [62, 33], e: [44, 42], w: [40, 51] });

  // ----- Patrones: posturas + velocidad (ms por transición) -----
  const P = {
    squat: { frames: [stand, squat], ms: 900 },
    jumpSquat: { frames: [squat, shift(armsUp, -8), stand], ms: 450 },
    lunge: { frames: [pose({ f: [62, 89], k: [60, 72], p: [54, 56], s: [54, 31], h: [54, 21], k2: [48, 72], f2: [44, 89] }), lungeDown], ms: 900 },
    jumpLunge: { frames: [lungeDown, shift(stand, -8), mirror(lungeDown)], ms: 500 },
    bulgarian: { frames: [pose({ f: [64, 89], k: [62, 72], p: [56, 56], s: [56, 31], h: [56, 21], e: [56, 43], w: [56, 54], k2: [44, 64], f2: [24, 70] }),
      pose({ f: [64, 89], k: [66, 74], p: [50, 72], s: [52, 47], h: [53, 37], e: [52, 59], w: [52, 70], k2: [38, 84], f2: [24, 70] })], ms: 1000, prop: 'bench-left' },
    pistol: { frames: [pose({ k2: [58, 70], f2: [70, 82] }), pose({ p: [40, 78], k: [58, 74], s: [52, 54], h: [56, 46], e: [64, 52], w: [76, 52], k2: [56, 78], f2: [73, 78] })], ms: 1100 },
    bridge: { frames: [supine, pose(Object.assign({}, supine, { p: [50, 73], k: [66, 72] }))], ms: 900 },
    bridgeOne: { frames: [pose(Object.assign({}, supine, { k2: [64, 74], f2: [80, 67] })), pose(Object.assign({}, supine, { p: [50, 73], k: [66, 72], k2: [66, 72], f2: [82, 71] }))], ms: 900 },
    calf: { frames: [stand, pose({ h: [50, 16], s: [50, 26], e: [50, 38], w: [51, 49], p: [50, 51], k: [50, 68], f: [50, 89] })], ms: 700 },
    wallSit: { frames: [pose({ s: [33, 46], h: [33, 36], p: [33, 70], k: [50, 70], f: [50, 89], e: [36, 58], w: [44, 68] }), pose({ s: [33, 45], h: [33, 35], p: [33, 70], k: [50, 70], f: [50, 89], e: [36, 58], w: [44, 68] })], ms: 1200, prop: 'wall' },
    deadlift: { frames: [pose({ w: [52, 58], e: [51, 45] }), hinge], ms: 1000 },
    singleDeadlift: { frames: [pose({ w: [52, 58], e: [51, 45] }), pose(Object.assign({}, hinge, { k2: [72, 52], f2: [88, 47] }))], ms: 1100 },
    goblet: { frames: [pose({ e: [56, 40], w: [56, 34] }), pose(Object.assign({}, squat, { e: [60, 52], w: [58, 44] }))], ms: 900, single: true },
    swing: { frames: [pose({ p: [60, 56], s: [40, 44], h: [34, 40], e: [46, 56], w: [50, 66], k: [54, 72], f: [52, 89] }), pose({ e: [60, 38], w: [72, 38] })], ms: 600, single: true },
    sideStep: { frames: [pose({ p: [50, 60], s: [50, 35], h: [50, 25], k: [46, 74], f: [45, 89], k2: [54, 74], f2: [55, 89], e: [44, 46], w: [42, 56], e2: [56, 46], w2: [58, 56] }),
      pose({ p: [52, 60], s: [52, 35], h: [52, 25], k: [42, 74], f: [36, 89], k2: [62, 74], f2: [68, 89], e: [46, 46], w: [44, 56], e2: [58, 46], w2: [60, 56] })], ms: 600 },
    pushup: { frames: [plankHigh, pushDown], ms: 900 },
    kneePushup: { frames: [pose(Object.assign({}, plankHigh, { p: [56, 78], k: [70, 88], f: [84, 80] })), pose(Object.assign({}, pushDown, { p: [56, 86], k: [70, 88], f: [84, 80] }))], ms: 900 },
    inclinePushup: { frames: [pose({ w: [28, 70], e: [30, 61], s: [32, 52], h: [27, 47], p: [58, 70], k: [73, 80], f: [88, 89] }),
      pose({ w: [28, 70], e: [42, 61], s: [32, 64], h: [26, 60], p: [58, 76], k: [73, 83], f: [88, 89] })], ms: 900, prop: 'box-left' },
    declinePushup: { frames: [pose({ w: [30, 89], e: [30, 80], s: [30, 70], h: [24, 67], p: [58, 70], k: [73, 69], f: [88, 68] }),
      pose({ w: [30, 89], e: [40, 83], s: [30, 82], h: [23, 79], p: [58, 78], k: [73, 72], f: [88, 68] })], ms: 900, prop: 'box-right' },
    pike: { frames: [pose({ w: [34, 89], e: [36, 80], s: [38, 71], h: [35, 77], p: [58, 50], k: [68, 70], f: [76, 89] }),
      pose({ w: [34, 89], e: [46, 80], s: [36, 82], h: [33, 87], p: [56, 56], k: [67, 73], f: [76, 89] })], ms: 900 },
    dips: { frames: [pose({ w: [40, 62], e: [40, 53], s: [41, 44], h: [44, 35], p: [46, 64], k: [64, 64], f: [70, 89] }),
      pose({ w: [40, 62], e: [31, 56], s: [41, 54], h: [44, 45], p: [46, 75], k: [64, 70], f: [70, 89] })], ms: 900, prop: 'chair' },
    press: { frames: [pose({ e: [56, 40], w: [56, 30] }), pose({ e: [52, 20], w: [51, 9] })], ms: 900 },
    floorPress: { frames: [pose(Object.assign({}, supine, { e: [28, 90], w: [28, 78] })), pose(Object.assign({}, supine, { e: [26, 74], w: [26, 62] }))], ms: 900 },
    chestPress: { frames: [pose({ e: [42, 40], w: [54, 38] }), pose({ e: [62, 36], w: [74, 36] })], ms: 800 },
    triceps: { frames: [pose({ e: [54, 14], w: [45, 21] }), pose({ e: [54, 14], w: [56, 2] })], ms: 900 },
    superman: { frames: [prone, pose(Object.assign({}, prone, { h: [15, 78], s: [24, 82], e: [14, 79], w: [4, 76], k: [70, 85], f: [88, 80] }))], ms: 1000 },
    ytw: { frames: [prone, pose(Object.assign({}, prone, { h: [16, 81], e: [18, 78], w: [8, 72] })), pose(Object.assign({}, prone, { h: [16, 81], e: [26, 76], w: [20, 74] }))], ms: 800 },
    swimmer: { frames: [pose(Object.assign({}, prone, { e: [14, 80], w: [4, 78], e2: [14, 88], w2: [4, 88], k: [70, 88], f: [88, 88], k2: [70, 86], f2: [88, 80] })),
      pose(Object.assign({}, prone, { e2: [14, 80], w2: [4, 78], e: [14, 88], w: [4, 88], k2: [70, 88], f2: [88, 88], k: [70, 86], f: [88, 80] }))], ms: 450 },
    tableRow: { frames: [pose({ w: [40, 40], e: [40, 51], s: [40, 62], h: [32, 60], p: [64, 74], k: [78, 80], f: [90, 88] }),
      pose({ w: [40, 40], e: [50, 52], s: [40, 46], h: [32, 44], p: [64, 64], k: [78, 74], f: [90, 88] })], ms: 900, prop: 'table' },
    hangHold: { frames: [hang, pose(Object.assign({}, hang, { s: [50, 25], e: [50, 17], h: [54, 18] }))], ms: 1400, prop: 'bar' },
    pullup: { frames: [hang, pose({ w: [50, 9], e: [58, 15], s: [49, 18], h: [54, 6], p: [49, 43], k: [50, 60], f: [52, 77] })], ms: 1000, prop: 'bar' },
    negative: { frames: [pose({ w: [50, 9], e: [58, 15], s: [49, 18], h: [54, 6], p: [49, 43], k: [50, 60], f: [52, 77] }), hang], ms: 2200, prop: 'bar', once: true },
    kneeRaise: { frames: [hang, pose(Object.assign({}, hang, { k: [64, 46], f: [66, 63] }))], ms: 900, prop: 'bar' },
    bentRow: { frames: [bentRowDown, bentRowUp], ms: 900 },
    curl: { frames: [pose({ e: [50, 42], w: [51, 54] }), pose({ e: [51, 42], w: [59, 34] })], ms: 800 },
    seatedRow: { frames: [pose(Object.assign({}, seated, { e: [51, 68], w: [62, 72] })), pose(Object.assign({}, seated, { s: [38, 62], e: [30, 68], w: [40, 70] }))], ms: 900 },
    facePull: { frames: [pose({ e: [62, 30], w: [74, 28] }), pose({ e: [42, 26], w: [52, 22] })], ms: 900 },
    plank: { frames: [pose({ e: [30, 89], w: [42, 89], s: [30, 77], h: [24, 73], p: [60, 79], k: [75, 84], f: [90, 88] }), pose({ e: [30, 89], w: [42, 89], s: [30, 77], h: [24, 72], p: [60, 78], k: [75, 84], f: [90, 88] })], ms: 1500 },
    sidePlank: { frames: [pose({ e: [30, 89], w: [42, 89], s: [30, 77], h: [24, 73], p: [60, 82], k: [75, 86], f: [90, 88], e2: [32, 66], w2: [33, 55] }),
      pose({ e: [30, 89], w: [42, 89], s: [30, 77], h: [24, 73], p: [60, 78], k: [75, 84], f: [90, 88], e2: [32, 66], w2: [33, 55] })], ms: 1300 },
    deadBug: { frames: [pose({ s: [30, 86], h: [22, 84], e: [30, 76], w: [30, 66], p: [54, 87], k: [54, 71], f: [70, 71] }),
      pose({ s: [30, 86], h: [22, 84], e: [20, 82], w: [10, 84], e2: [30, 76], w2: [30, 66], p: [54, 87], k: [68, 80], f: [84, 86], k2: [54, 71], f2: [70, 71] })], ms: 900 },
    birdDog: { frames: [quad, pose(Object.assign({}, quad, { e: [20, 68], w: [8, 66], k: [74, 70], f: [90, 68], e2: [30, 79], w2: [30, 89], k2: [58, 88], f2: [76, 89] }))], ms: 1000 },
    bicycle: { frames: [pose({ h: [18, 82], s: [26, 86], e: [20, 78], w: [16, 82], p: [52, 87], k: [48, 72], f: [62, 74], k2: [68, 80], f2: [84, 78] }),
      pose({ h: [24, 76], s: [32, 81], e: [26, 72], w: [22, 76], p: [52, 87], k2: [48, 72], f2: [62, 74], k: [68, 80], f: [84, 78] })], ms: 600 },
    climber: { frames: [pose(Object.assign({}, plankHigh, { k: [44, 79], f: [52, 88], k2: [73, 81], f2: [88, 88] })), pose(Object.assign({}, plankHigh, { k2: [44, 79], f2: [52, 88], k: [73, 81], f: [88, 88] }))], ms: 300 },
    shoulderTap: { frames: [plankHigh, pose(Object.assign({}, plankHigh, { e: [38, 77], w: [32, 70], e2: [30, 79], w2: [30, 89] }))], ms: 600 },
    hollow: { frames: [pose({ h: [18, 74], s: [26, 78], e: [16, 74], w: [6, 70], p: [48, 86], k: [66, 82], f: [84, 76] }), pose({ h: [18, 75], s: [26, 79], e: [16, 75], w: [6, 71], p: [48, 86], k: [66, 83], f: [84, 77] })], ms: 1200 },
    legRaise: { frames: [pose(Object.assign({}, supine, { k: [66, 86], f: [82, 84] })), pose(Object.assign({}, supine, { k: [56, 73], f: [60, 56] }))], ms: 1000 },
    twist: { frames: [pose(Object.assign({}, seated, { s: [42, 64], h: [38, 56], k: [62, 74], f: [76, 80], e: [52, 70], w: [60, 76] })), pose(Object.assign({}, seated, { s: [42, 64], h: [38, 56], k: [62, 74], f: [76, 80], e: [44, 74], w: [48, 82] }))], ms: 600 },
    jack: { frames: [jackClosed, jackOpen], ms: 380 },
    run: { frames: [runA, runB], ms: 300 },
    march: { frames: [runA, runB], ms: 600 },
    boxing: { frames: [pose({ k: [56, 72], f: [60, 89], k2: [44, 72], f2: [40, 89], e: [62, 31], w: [74, 30], e2: [52, 40], w2: [57, 31] }),
      pose({ k: [56, 72], f: [60, 89], k2: [44, 72], f2: [40, 89], e2: [62, 31], w2: [74, 30], e: [52, 40], w: [57, 31] })], ms: 350 },
    burpee: { frames: [stand, pose(Object.assign({}, squat, { e: [60, 70], w: [62, 86] })), plankHigh, pose(Object.assign({}, squat, { e: [60, 70], w: [62, 86] })), shift(armsUp, -8)], ms: 380 },
    skater: { frames: [pose({ p: [40, 60], s: [44, 36], h: [46, 26], k: [40, 75], f: [38, 89], k2: [48, 76], f2: [58, 86], e: [56, 46], w: [62, 54], e2: [36, 44], w2: [28, 50] }),
      mirror({ p: [40, 60], s: [44, 36], h: [46, 26], k: [40, 75], f: [38, 89], k2: [48, 76], f2: [58, 86], e: [56, 46], w: [62, 54], e2: [36, 44], w2: [28, 50] })], ms: 450 },
    rope: { frames: [pose({ e: [56, 44], w: [62, 54] }), shift({ e: [56, 44], w: [62, 54] }, -5)], ms: 250 },
    bear: { frames: [pose({ w: [30, 89], e: [30, 80], s: [30, 71], h: [23, 67], p: [58, 68], k: [62, 82], f: [76, 89], w2: [36, 89], e2: [34, 80], k2: [66, 82], f2: [80, 89] }),
      pose({ w: [36, 89], e: [34, 80], s: [32, 71], h: [25, 67], p: [60, 68], k: [66, 82], f: [80, 89], w2: [30, 89], e2: [30, 80], k2: [62, 82], f2: [76, 89] })], ms: 400 },
    armCircles: { frames: [pose({ e: [50, 19], w: [50, 8] }), pose({ e: [61, 30], w: [72, 30] }), pose({ e: [50, 41], w: [50, 52] }), pose({ e: [39, 30], w: [28, 30] })], ms: 350, loop: true },
    hipCircles: { frames: [pose({ p: [44, 55], e: [46, 44], w: [46, 54] }), pose({ p: [50, 58], e: [50, 44], w: [50, 54] }), pose({ p: [56, 55], e: [54, 44], w: [54, 54] }), pose({ p: [50, 52], e: [50, 42], w: [50, 52] })], ms: 400, loop: true },
    catCamel: { frames: [pose(Object.assign({}, quad, { h: [23, 74], s: [30, 68], p: [58, 68] })), pose(Object.assign({}, quad, { h: [23, 61], s: [30, 72], p: [58, 72] }))], ms: 1200 },
    inchworm: { frames: [stand, pose({ p: [56, 52], s: [44, 70], h: [42, 78], e: [44, 80], w: [46, 89], k: [54, 72], f: [52, 89] }), plankHigh, pose({ p: [56, 52], s: [44, 70], h: [42, 78], e: [44, 80], w: [46, 89], k: [54, 72], f: [52, 89] })], ms: 900 },
    ankles: { frames: [pose({ p: [50, 58], s: [53, 35], h: [55, 26], k: [56, 74], e: [56, 50], w: [57, 66] }), pose({ p: [50, 58], s: [53, 35], h: [55, 26], k: [52, 72], e: [54, 50], w: [55, 66] })], ms: 600 },
    quadStretch: { frames: [pose({ k2: [50, 72], f2: [40, 60], e2: [44, 46], w2: [40, 58] }), pose({ h: [51, 20], k2: [50, 72], f2: [40, 59], e2: [44, 46], w2: [40, 57] })], ms: 1600 },
    hamStretch: { frames: [pose(Object.assign({}, seated, { s: [44, 64], h: [48, 56], e: [52, 72], w: [60, 80] })), pose(Object.assign({}, seated, { s: [52, 70], h: [58, 66], e: [62, 78], w: [72, 86] }))], ms: 1800 },
    chestStretch: { frames: [pose({ e: [38, 32], w: [30, 22] }), pose({ h: [52, 20], s: [52, 30], p: [51, 55], e: [38, 32], w: [30, 22] })], ms: 1600, prop: 'wall-left' },
    child: { frames: [pose({ f: [84, 89], k: [62, 89], p: [76, 80], s: [48, 84], h: [40, 86], e: [32, 88], w: [20, 89] }), pose({ f: [84, 89], k: [62, 89], p: [76, 79], s: [48, 82], h: [40, 85], e: [32, 88], w: [20, 89] })], ms: 1800 },
    figure4: { frames: [pose(Object.assign({}, supine, { k: [60, 72], f: [72, 80], k2: [68, 66], f2: [58, 70], e: [52, 78], w: [60, 74] })), pose(Object.assign({}, supine, { k: [58, 70], f: [70, 76], k2: [66, 63], f2: [56, 68], e: [50, 76], w: [58, 72] }))], ms: 1600 },
    shoulderStretch: { frames: [pose({ e: [58, 34], w: [44, 32], e2: [56, 44], w2: [56, 34] }), pose({ e: [58, 33], w: [42, 32], e2: [56, 43], w2: [55, 33] })], ms: 1600 },
    breathe: { frames: [pose(Object.assign({}, supine, { k: [66, 88], f: [84, 88] })), pose(Object.assign({}, supine, { s: [22, 84], h: [14, 82], k: [66, 88], f: [84, 88] }))], ms: 2400 },
  };

  const MAP = {
    sentadilla: 'squat', 'sentadilla-sumo': 'squat', 'zancada-atras': 'lunge', 'zancada-caminando': 'lunge', 'puente-gluteo': 'bridge',
    'puente-una-pierna': 'bridgeOne', talones: 'calf', 'sentadilla-pared': 'wallSit', bulgara: 'bulgarian', 'peso-muerto-1p': 'singleDeadlift',
    'sentadilla-salto': 'jumpSquat', 'zancada-salto': 'jumpLunge', 'pistol-asistida': 'pistol', goblet: 'goblet', 'peso-muerto-rumano': 'deadlift',
    'zancada-peso': 'lunge', swing: 'swing', 'caminata-banda': 'sideStep',
    'flexion-inclinada': 'inclinePushup', 'flexion-rodillas': 'kneePushup', flexion: 'pushup', 'flexion-diamante': 'pushup', 'flexion-declinada': 'declinePushup',
    'flexion-pica': 'pike', 'fondos-silla': 'dips', 'press-hombros': 'press', 'press-suelo': 'floorPress', 'press-banda': 'chestPress', 'extension-triceps': 'triceps',
    superman: 'superman', ytw: 'ytw', nadador: 'swimmer', 'remo-mesa': 'tableRow', colgarse: 'hangHold', 'dominada-negativa': 'negative', dominada: 'pullup',
    'remo-mancuerna': 'bentRow', 'remo-inclinado': 'bentRow', curl: 'curl', 'remo-banda': 'seatedRow', 'face-pull': 'facePull',
    plancha: 'plank', 'plancha-lateral': 'sidePlank', 'bicho-muerto': 'deadBug', 'perro-muestra': 'birdDog', 'crunch-bici': 'bicycle', escaladores: 'climber',
    'toque-hombro': 'shoulderTap', barquito: 'hollow', 'elevacion-piernas': 'legRaise', 'rodillas-colgado': 'kneeRaise', 'giro-ruso': 'twist',
    'jumping-jacks': 'jack', 'rodillas-altas': 'run', 'boxeo-sombra': 'boxing', 'marcha-rapida': 'march', burpee: 'burpee', patinador: 'skater', comba: 'rope',
    oso: 'bear', piques: 'run', 'ida-vuelta': 'run',
    'cal-marcha': 'march', 'cal-brazos': 'armCircles', 'cal-cadera': 'hipCircles', 'cal-gato': 'catCamel', 'cal-sentadilla': 'squat', 'cal-tobillos': 'ankles', 'cal-gusano': 'inchworm',
    'est-cuadriceps': 'quadStretch', 'est-isquios': 'hamStretch', 'est-pecho': 'chestStretch', 'est-nino': 'child', 'est-cadera': 'figure4', 'est-hombro': 'shoulderStretch', 'est-respiracion': 'breathe',
  };

  const PROPS = {
    bar: '<line x1="28" y1="8" x2="72" y2="8" class="prop-line"/>',
    wall: '<line x1="29" y1="20" x2="29" y2="90" class="prop-line"/>',
    'wall-left': '<line x1="27" y1="10" x2="27" y2="90" class="prop-line"/>',
    chair: '<path d="M26 62h20M28 62v28M44 62v28" class="prop-line"/>',
    table: '<path d="M14 40h40M18 40v50M50 40v50" class="prop-line"/>',
    'bench-left': '<rect x="10" y="70" width="20" height="20" rx="2" class="prop-fill"/>',
    'box-left': '<rect x="16" y="70" width="24" height="20" rx="2" class="prop-fill"/>',
    'box-right': '<rect x="80" y="68" width="18" height="22" rx="2" class="prop-fill"/>',
  };

  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw(svg, q, props) {
    const L = (a, b, c) => `M${q[a][0].toFixed(1)} ${q[a][1].toFixed(1)}L${q[b][0].toFixed(1)} ${q[b][1].toFixed(1)}` + (c ? `L${q[c][0].toFixed(1)} ${q[c][1].toFixed(1)}` : '');
    const back = L('s', 'e2', 'w2') + L('p', 'k2', 'f2');
    const front = L('s', 'p') + L('s', 'e', 'w') + L('p', 'k', 'f');
    let weight = '';
    if (props.implement === 'mancuernas') {
      weight = [q.w, q.w2].map(([x, y]) => `<rect x="${(x - 5).toFixed(1)}" y="${(y - 2).toFixed(1)}" width="10" height="4" rx="1.5" class="weight"/>`).join('');
    } else if (props.implement === 'pesarusa') {
      const [x, y] = props.single ? lerp(q.w, q.w2, 0.5) : q.w;
      weight = `<circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="5" class="weight"/><path d="M${(x - 3).toFixed(1)} ${(y + 1).toFixed(1)}a3 3 0 0 1 6 0" class="weight-handle"/>`;
    }
    svg.querySelector('.back').setAttribute('d', back);
    svg.querySelector('.front').setAttribute('d', front);
    svg.querySelector('.head').setAttribute('cx', q.h[0].toFixed(1));
    svg.querySelector('.head').setAttribute('cy', q.h[1].toFixed(1));
    svg.querySelector('.weights').innerHTML = weight;
  }

  /** Coloca la animación de un ejercicio dentro de `el`. */
  function mount(el, exId, implement) {
    const pat = P[MAP[exId]];
    if (!el || !pat) return;
    const props = { implement, single: pat.single };
    el.innerHTML = `<svg viewBox="0 0 100 100" class="anim" role="img" aria-label="Animación del ejercicio">
      <line x1="2" y1="90.5" x2="98" y2="90.5" class="ground"/>
      ${PROPS[pat.prop] || ''}
      <path class="back limb"/><path class="front limb"/><circle class="head" r="6"/><g class="weights"></g>
    </svg>`;
    const svg = el.firstElementChild;
    const frames = pat.frames.map(full);
    draw(svg, frames[0], props);
    if (reduced()) { draw(svg, frames[Math.min(1, frames.length - 1)], props); return; }
    // ida y vuelta (A→B→A) salvo los que giran en bucle o van en un solo sentido
    const seq = pat.loop || pat.once || frames.length > 2 ? frames : [frames[0], frames[1]];
    const n = pat.once ? seq.length - 1 : seq.length;
    const total = n * pat.ms + (pat.once ? 600 : 0);
    const start = performance.now();
    const step = now => {
      if (!svg.isConnected) return;
      let t = ((now - start) % total) / pat.ms;
      let i = Math.floor(t);
      if (i >= n) { draw(svg, seq[seq.length - 1], props); requestAnimationFrame(step); return; }
      const a = seq[i], b = seq[(i + 1) % seq.length];
      const k = ease(t - i);
      const q = {};
      for (const key in a) q[key] = lerp(a[key], b[key], k);
      draw(svg, q, props);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Activa las animaciones de todos los elementos [data-anim] dentro de `root`. */
  function mountAll(root = document) {
    root.querySelectorAll('[data-anim]:not([data-anim-on])').forEach(el => {
      el.setAttribute('data-anim-on', '');
      mount(el, el.dataset.anim, el.dataset.impl);
    });
  }

  return { mount, mountAll, has: id => !!MAP[id] };
})();
