const CAB={
  id:'claw',                    // file name in the arcade: games/<id>.html
  title:'PLUSH PANIC',          // shown on the marquee and in the arcade
  brand:'PLUSH PANIC',sub:'HYPERDOT ARCADE',
  style:'color',                // full-colour LED: soft-body plush characters need hue
  res:[[192,108],[256,144],[320,180]], // matrix sizes the Dots chip cycles through
  resDefault:1,
  tickets:true,                 // pays tickets into the arcade's prize counter
  keys:'<b>Arrows</b> move · <b>Space</b> tap to set, hold to travel · <b>Shift</b> drop now · <b>Drag</b> the claw · <b>Esc</b> pause'
};
