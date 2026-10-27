const CAB={
  id:'bowl',                    // file name in the arcade: games/<id>.html
  title:'STRIKE NIGHT',         // shown on the marquee and in the arcade
  brand:'STRIKE NIGHT',sub:'HYPERDOT ARCADE',
  style:'color',                // LED look: 'color' | 'amber' (classic mono DMD) | 'lamp' (big incandescent bulbs)
  res:[[192,108],[256,144],[320,180]], // matrix sizes the Dots chip cycles through (16:9 recommended)
  resDefault:1,
  tickets:true,                 // this cabinet pays tickets into the arcade's prize counter
  keys:'<b>Drag</b> the ball sideways to move · <b>swipe up</b> to bowl, curve the swipe to hook · or <b>Arrows</b> + <b>Space</b>: line, aim, power · <b>Shift</b> spin · <b>Esc</b> pause'
};
