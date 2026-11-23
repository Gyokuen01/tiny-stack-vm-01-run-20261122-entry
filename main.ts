import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
const enc=new TextEncoder();
// opcode -> imm*100 + pops*10 + pushes, stored +1 (0 = unknown opcode)
const TA=new Uint16Array(256);
for(const [o,c] of [[0,0],[1,101],[2,401],[3,10],[4,12],[5,22],[6,23],[7,33],[16,21],[17,21],[18,21],[19,21],[20,21],[21,21],[22,21],[23,11],[24,21],[25,21],[26,21],[27,11],[28,21],[29,21],[30,21],[32,21],[33,21],[34,21],[48,200],[49,210],[50,210],[51,200],[52,0],[64,11],[65,20],[80,10],[81,10],[82,1],[83,10]])TA[o]=c+1;
function run(p:Uint8Array,inp:Uint8Array){
  const n=p.length,D=new Int32Array(256);let sp=0;
  const C=new Int32Array(64);let cp=0;
  const M=new Int32Array(256),out=new Uint8Array(65536);
  let ol=0,ip=0,pc=0,steps=0;
  const done=(e:number)=>({out:out.slice(0,ol),exit:e});
  for(;;){
    if(steps===1000000)return done(10);
    if(pc<0||pc>=n)return done(9);
    const op=p[pc],t=TA[op];
    if(t===0)return done(5);
    const c=t-1,imm=(c/100)|0,pops=((c/10)|0)%10,push=c%10;
    if(pc+imm>=n)return done(9);
    steps++;
    const nx=pc+1+imm;
    if(sp<pops)return done(2);
    if(sp-pops+push>256)return done(3);
    pc=nx;
    switch(op){
      case 0:return done(0);
      case 1:D[sp++]=(p[nx-1]<<24)>>24;break;
      case 2:D[sp++]=p[nx-4]|p[nx-3]<<8|p[nx-2]<<16|p[nx-1]<<24;break;
      case 3:sp--;break;
      case 4:D[sp]=D[sp-1];sp++;break;
      case 5:{const x=D[sp-1];D[sp-1]=D[sp-2];D[sp-2]=x;break;}
      case 6:D[sp]=D[sp-2];sp++;break;
      case 7:{const a=D[sp-3];D[sp-3]=D[sp-2];D[sp-2]=D[sp-1];D[sp-1]=a;break;}
      case 23:D[sp-1]=-D[sp-1]|0;break;
      case 27:D[sp-1]=~D[sp-1];break;
      case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
        const b=D[sp-1],a=D[sp-2];let r=0;
        switch(op){
          case 16:r=(a+b)|0;break;
          case 17:r=(a-b)|0;break;
          case 18:r=Math.imul(a,b);break;
          case 19:if(b===0)return done(4);r=a===-2147483648&&b===-1?a:(a/b)|0;break;
          case 20:if(b===0)return done(4);r=b===-1?0:(a%b)|0;break;
          case 21:if(b===0)return done(4);r=Math.floor((a>>>0)/(b>>>0))|0;break;
          case 22:if(b===0)return done(4);r=((a>>>0)%(b>>>0))|0;break;
          case 24:r=a&b;break;
          case 25:r=a|b;break;
          case 26:r=a^b;break;
          case 28:r=a<<(b&31);break;
          case 29:r=a>>(b&31);break;
          case 30:r=(a>>>(b&31))|0;break;
          case 32:r=a===b?1:0;break;
          case 33:r=a<b?1:0;break;
          case 34:r=(a>>>0)<(b>>>0)?1:0;break;
        }
        sp-=2;D[sp++]=r;break;
      }
      case 48:case 49:case 50:{
        const rel=((p[nx-2]|p[nx-1]<<8)<<16)>>16;
        let take=true;
        if(op!==48){const v=D[--sp];take=op===49?v===0:v!==0;}
        if(take)pc=nx+rel;
        break;
      }
      case 51:if(cp===64)return done(7);C[cp++]=nx;pc=p[nx-2]|p[nx-1]<<8;break;
      case 52:if(cp===0)return done(8);pc=C[--cp];break;
      case 64:{const a=D[sp-1];if(a<0||a>=256)return done(6);D[sp-1]=M[a];break;}
      case 65:{const a=D[sp-1],v=D[sp-2];if(a<0||a>=256)return done(6);sp-=2;M[a]=v;break;}
      case 80:{const b=enc.encode(String(D[sp-1]));if(ol+b.length>65536)return done(11);sp--;out.set(b,ol);ol+=b.length;break;}
      case 81:if(ol+1>65536)return done(11);out[ol++]=D[--sp]&255;break;
      case 82:D[sp++]=ip<inp.length?inp[ip++]:-1;break;
      case 83:return done(D[--sp]&255);
    }
  }
}
for(const id of readdirSync(I).sort()){
  const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
  mkdirSync(join(O,id),{recursive:true});
  writeFileSync(join(O,id,'stdout.bin'),r.out);
  writeFileSync(join(O,id,'exit.txt'),r.exit+'\n');
}
