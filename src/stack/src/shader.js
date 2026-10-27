const FS_LED=`in vec2 vT;uniform sampler2D uTex;uniform vec2 uRes;uniform float uGain;uniform int uStyle;out vec4 o;
/* style 2: an incandescent bulb seated in a chrome reflector cup. c is the light its filament gives off (linear).
   A dim filament lights only its coil and the middle of the frosted envelope; a hot one fills the envelope and
   whitens at the centre. The cup mirrors a ring of the bulb's own light; the glass keeps a small window highlight
   so dark bulbs still read as glass. Everything else (bloom, tonemap) is the house pipeline. */
vec3 bulb(vec3 c,vec2 f,float fw){
  float d=length(f),L=max(c.r,max(c.g,c.b)),b=clamp(L*1.12,0.,1.);
  vec3 hue=c/max(L,1e-5);float I=L*uGain,aa=fw*.7+.012;
  const float RG=.395;
  float env=1.-smoothstep(RG-aa,RG+aa,d);
  float sb=sqrt(b);vec2 rc=vec2(mix(.11,.255,sb),mix(.045,.255,sb));      // a dim filament glows as a short coil; a hot one blooms round
  vec2 fe=(f-vec2(0.,-.012))/rc;float core=exp(-dot(fe,fe));
  float fil=(1.-smoothstep(.05,.085+aa,abs(f.x)))*(1.-smoothstep(.011,.03+aa,abs(f.y+.012)));
  vec3 col=hue*I*(core*1.06+env*(.07+.24*b)*(1.-.62*d/RG)+fil*(1.5-b)*.7);
  float sat=1.-min(hue.r,min(hue.g,hue.b));
  col=mix(col,vec3(dot(col,vec3(.36,.42,.22))),.3*core*b*(1.-sat*sat));   // only near-white light runs whiter at the core
  float cup=smoothstep(RG+.004,RG+.045,d)*(1.-smoothstep(.45,.5,d));
  float ang=.6+.4*sin(atan(f.y,f.x)*1.0+2.4);
  col+=(hue*I*.13*ang+vec3(.016,.015,.018))*cup;
  vec2 h=(f-vec2(-.135,.15))*vec2(1.,1.55);
  col+=vec3(.5,.5,.56)*exp(-dot(h,h)/.0022)*env*(.06+.22*b);
  col+=vec3(.010,.009,.012)*env*(1.-d/RG);
  float far=smoothstep(.36,.9,fw);
  return mix(col,hue*I*.42+vec3(.01),far);
}
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;
  vec3 c=texture(uTex,(id+.5)/uRes).rgb;c=pow(c,vec3(2.2));
  float fw=max(fwidth(cell.x),fwidth(cell.y));
  vec3 col;
  if(uStyle==2){col=bulb(c,f,fw);}
  else{
    float r=.43;
    if(uStyle==1){float l=dot(c,vec3(.3,.59,.11));l=floor(pow(l,.8)*15.+.5)/15.;c=vec3(1.,.38,.06)*l*1.25;r=.4;}
    float d=length(f);
    float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,d);
    float hot=1.0-smoothstep(0.0,r,d);
    float far=smoothstep(.38,.95,fw);
    float m=mix(dm*(.74+.48*hot),.58,far);
    vec3 unlit=(uStyle==1?vec3(.6,.25,.08):vec3(.52,.5,.62))*.016;
    col=(c*uGain+unlit)*m;
  }
  vec2 q=vT-vec2(.22,.9);col+=vec3(.010,.010,.014)*(1.0-smoothstep(0.0,.8,length(q)));
  o=vec4(col,1.0);
}`;
