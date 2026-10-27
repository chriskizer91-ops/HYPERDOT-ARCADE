const TRACKS={
  /* attract: a fairground oom-pah in D major */
  title:{bpm:112,root:50,scale:'major',prog:[0,3,4,0],bass:'R...F...R...F...',lead:'1-3-5-3-4-6-5---3-5-8-7-5---3---',kick:'x.......x.......',snare:'....x.......x...',hat:'..x...x...x...x.',arp:'8',pad:1,lv:.03},
  /* play: driving A minor; its tempo is retuned every row (spawnRow) so the music climbs with the speed */
  play:{bpm:120,root:45,scale:'minor',prog:[0,5,3,4],bass:'R.RO.RR.R.RO.RF.',lead:'5...4...3...2...1.3.5.8.7...5...',kick:'x...x...x...x...',snare:'....x.......x...',hat:'x.x.x.x.x.x.x.xx',arp:'16',pad:1,lv:.02},
  /* the decision: harmonic minor, a held breath and a clock */
  decide:{bpm:96,root:45,scale:'harm',prog:[0,0,4,4],bass:'R.......R...R...',lead:'................................',kick:'x.......x.......',snare:'................',hat:'x...x...x...x...',arp:'8',pad:1,lv:0},
  /* prize: bright C major fanfare */
  win:{bpm:150,root:48,scale:'major',prog:[0,3,4,0],bass:'R.O.R.O.F.O.R.O.',lead:'1-3-5-8---5-8-a-8-------5-3-5-8-',kick:'x...x...x...x...',snare:'....x.......x...',hat:'xxxxxxxxxxxxxxxx',arp:'16',pad:1,lv:.035},
  /* game over: a slow, kind minor */
  over:{bpm:80,root:45,scale:'minor',prog:[0,5,3,4],bass:'R.......F.......',lead:'5---4---3-------2---1-----------',kick:'x.......x.......',snare:'................',hat:'....x.......x...',pad:1,lv:.022}
};
