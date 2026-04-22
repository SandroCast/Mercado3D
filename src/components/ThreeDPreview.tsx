import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../contexts/ThemeContext";

// ─── Formats we can render ────────────────────────────────────────────────────

const PREVIEWABLE = ["STL", "OBJ", "3MF"];

// ─── Convert ArrayBuffer → base64 safely (avoids call stack overflow) ────────

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  return btoa(binary);
}

// ─── HTML viewer (receives model as base64, no fetch inside WebView) ──────────
// Three.js is loaded from CDN WITHOUT crossorigin/integrity to avoid null-origin
// CORS rejection that happens when WebView injects HTML (origin = null).

function buildViewerHtml(base64: string, format: string): string {
  const fmt = format.toUpperCase();

  // JSZip needed only for 3MF (ZIP-based format). No crossorigin attr → loads fine.
  const jsZipScript =
    fmt === "3MF"
      ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>`
      : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0d1117;overflow:hidden}
    canvas{display:block;width:100vw;height:100vh;touch-action:none}
    #loader{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0d1117;color:#22d3ee;font-family:system-ui,sans-serif;gap:14px}
    .sp{width:40px;height:40px;border:3px solid #1e2d40;border-top-color:#22d3ee;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #loader p{font-size:14px;opacity:.7}
    #error{display:none;position:fixed;inset:0;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:#0d1117;color:#ef4444;font-family:system-ui,sans-serif;text-align:center;padding:24px}
    #error p{font-size:14px;color:#94a3b8}
    #hint{position:fixed;bottom:20px;left:0;right:0;text-align:center;color:#64748b;font-family:system-ui,sans-serif;font-size:12px;pointer-events:none}
  </style>
  <!-- No crossorigin/integrity — avoids CORS null-origin rejection in WebView -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  ${jsZipScript}
</head>
<body>
  <div id="loader"><div class="sp"></div><p>Renderizando modelo 3D...</p></div>
  <div id="error"><span style="font-size:32px">&#x26A0;&#xFE0F;</span><p>Nao foi possivel renderizar o modelo.</p></div>
  <div id="hint">&#x1F590; Arraste para girar &bull; Pinca para zoom</div>
  <script>
    if(typeof THREE==='undefined'){
      document.getElementById('loader').style.display='none';
      document.getElementById('error').style.display='flex';
      throw new Error('Three.js not loaded');
    }

    var FORMAT=${JSON.stringify(fmt)};
    // Base64 model data (pre-fetched by React Native — no CORS issue)
    var MODEL_B64=${JSON.stringify(base64)};

    function b64ToBuffer(b64){
      var bin=atob(b64),len=bin.length,buf=new ArrayBuffer(len),view=new Uint8Array(buf);
      for(var i=0;i<len;i++)view[i]=bin.charCodeAt(i);
      return buf;
    }

    // ── Scene ──────────────────────────────────────────────────────────────────
    var renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.outputEncoding=THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    var scene=new THREE.Scene();
    scene.background=new THREE.Color(0x0d1117);

    var camera=new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.01,1000);
    camera.position.set(0,0,2);

    scene.add(new THREE.AmbientLight(0xffffff,.5));
    var d1=new THREE.DirectionalLight(0xffffff,1.2);d1.position.set(5,10,7.5);scene.add(d1);
    var d2=new THREE.DirectionalLight(0x22d3ee,.4);d2.position.set(-5,-5,-5);scene.add(d2);

    var mesh=null,autoRotate=true;

    // ── STL parser (binary + ASCII) ─────────────────────────────────────────────
    function parseSTL(buf){
      var view=new DataView(buf),faces=view.getUint32(80,true);
      var isBin=buf.byteLength===84+faces*50;
      var pos=[],nor=[];
      if(isBin){
        for(var i=0;i<faces;i++){
          var off=84+i*50;
          var nx=view.getFloat32(off,true),ny=view.getFloat32(off+4,true),nz=view.getFloat32(off+8,true);
          for(var v=0;v<3;v++){var vo=off+12+v*12;pos.push(view.getFloat32(vo,true),view.getFloat32(vo+4,true),view.getFloat32(vo+8,true));nor.push(nx,ny,nz);}
        }
      }else{
        var cn=[0,0,0],lines=new TextDecoder().decode(buf).split('\\n');
        for(var li=0;li<lines.length;li++){
          var t=lines[li].trim();
          if(t.indexOf('facet normal')===0){var p=t.split(' ');cn=[parseFloat(p[2]),parseFloat(p[3]),parseFloat(p[4])];}
          else if(t.indexOf('vertex')===0){var p2=t.split(' ');pos.push(parseFloat(p2[1]),parseFloat(p2[2]),parseFloat(p2[3]));nor.push(cn[0],cn[1],cn[2]);}
        }
      }
      var geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
      return geo;
    }

    // ── OBJ parser ──────────────────────────────────────────────────────────────
    function parseOBJ(text){
      var pos=[],nor=[],posOut=[],norOut=[];
      var lines=text.split('\\n');
      for(var li=0;li<lines.length;li++){
        var parts=lines[li].trim().split(/[ \\t]+/);
        if(parts[0]==='v')pos.push(parseFloat(parts[1]),parseFloat(parts[2]),parseFloat(parts[3]));
        else if(parts[0]==='vn')nor.push(parseFloat(parts[1]),parseFloat(parts[2]),parseFloat(parts[3]));
        else if(parts[0]==='f'){
          var face=[];
          for(var fi=1;fi<parts.length;fi++){var s=parts[fi].split('/');face.push({pi:(parseInt(s[0])-1)*3,ni:s.length>2&&s[2]!==''?(parseInt(s[2])-1)*3:-1});}
          for(var ti=1;ti<face.length-1;ti++){
            var tri=[face[0],face[ti],face[ti+1]];
            for(var vi=0;vi<3;vi++){var vt=tri[vi];posOut.push(pos[vt.pi],pos[vt.pi+1],pos[vt.pi+2]);if(vt.ni>=0)norOut.push(nor[vt.ni],nor[vt.ni+1],nor[vt.ni+2]);}
          }
        }
      }
      var geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(posOut,3));
      if(norOut.length===posOut.length&&norOut.length>0)geo.setAttribute('normal',new THREE.Float32BufferAttribute(norOut,3));
      else geo.computeVertexNormals();
      return geo;
    }

    // ── 3MF parser (ZIP+XML via JSZip) ──────────────────────────────────────────
    function parse3MF(buf){
      if(typeof JSZip==='undefined')return Promise.reject(new Error('JSZip not loaded'));
      return JSZip.loadAsync(buf).then(function(zip){
        var names=Object.keys(zip.files),modelName=null;
        for(var i=0;i<names.length;i++){if(names[i].indexOf('.model')!==-1){modelName=names[i];break;}}
        if(!modelName)throw new Error('No .model in 3MF');
        return zip.files[modelName].async('text');
      }).then(function(xml){
        var doc=new DOMParser().parseFromString(xml,'text/xml');
        var positions=[],indices=[],offset=0;
        var meshEls=doc.querySelectorAll('mesh');
        for(var mi=0;mi<meshEls.length;mi++){
          var verts=meshEls[mi].querySelectorAll('vertices vertex');
          var tris=meshEls[mi].querySelectorAll('triangles triangle');
          for(var vi=0;vi<verts.length;vi++)positions.push(parseFloat(verts[vi].getAttribute('x')),parseFloat(verts[vi].getAttribute('y')),parseFloat(verts[vi].getAttribute('z')));
          for(var ti=0;ti<tris.length;ti++)indices.push(parseInt(tris[ti].getAttribute('v1'))+offset,parseInt(tris[ti].getAttribute('v2'))+offset,parseInt(tris[ti].getAttribute('v3'))+offset);
          offset+=verts.length;
        }
        var geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geo.setIndex(indices);geo.computeVertexNormals();
        return geo;
      });
    }

    // ── Place mesh ──────────────────────────────────────────────────────────────
    function showMesh(geo){
      geo.computeBoundingBox();
      var box=geo.boundingBox,c=new THREE.Vector3();box.getCenter(c);
      geo.translate(-c.x,-c.y,-c.z);
      var s=new THREE.Vector3();box.getSize(s);
      var scale=1.5/Math.max(s.x,s.y,s.z);
      var mat=new THREE.MeshPhongMaterial({color:0x22d3ee,specular:0x0891b2,shininess:60,side:THREE.DoubleSide});
      mesh=new THREE.Mesh(geo,mat);mesh.scale.setScalar(scale);scene.add(mesh);
      document.getElementById('loader').style.display='none';
    }

    function showError(){
      document.getElementById('loader').style.display='none';
      document.getElementById('error').style.display='flex';
    }

    // ── Load model from embedded base64 (no fetch, no CORS) ─────────────────────
    function loadModel(){
      try{
        var buf=b64ToBuffer(MODEL_B64);
        if(FORMAT==='OBJ'){showMesh(parseOBJ(new TextDecoder().decode(buf)));}
        else if(FORMAT==='3MF'){parse3MF(buf).then(showMesh).catch(showError);}
        else{showMesh(parseSTL(buf));}
      }catch(e){showError();}
    }

    // ── Touch controls ──────────────────────────────────────────────────────────
    var lx=0,ly=0,ld=0;
    renderer.domElement.addEventListener('touchstart',function(e){e.preventDefault();autoRotate=false;if(e.touches.length===1){lx=e.touches[0].clientX;ly=e.touches[0].clientY;}else if(e.touches.length===2){var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;ld=Math.sqrt(dx*dx+dy*dy);}},{passive:false});
    renderer.domElement.addEventListener('touchmove',function(e){e.preventDefault();if(!mesh)return;if(e.touches.length===1){mesh.rotation.y+=(e.touches[0].clientX-lx)*0.01;mesh.rotation.x+=(e.touches[0].clientY-ly)*0.01;lx=e.touches[0].clientX;ly=e.touches[0].clientY;}else if(e.touches.length===2){var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;var d=Math.sqrt(dx*dx+dy*dy);camera.position.z=Math.max(.3,Math.min(10,camera.position.z*ld/d));ld=d;}},{passive:false});
    renderer.domElement.addEventListener('touchend',function(){setTimeout(function(){autoRotate=true;},2000);});

    // ── Render loop ─────────────────────────────────────────────────────────────
    (function animate(){requestAnimationFrame(animate);if(mesh&&autoRotate)mesh.rotation.y+=0.005;renderer.render(scene,camera);})();
    window.addEventListener('resize',function(){camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});

    loadModel();
  </script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ThreeDPreviewProps {
  formatFiles?: Record<string, string>;
  fileUrl?: string;
  format?: string;
  title?: string;
}

type Phase = "idle" | "fetching" | "rendering" | "error";

export function ThreeDPreviewButton({
  formatFiles,
  fileUrl,
  format,
  title = "Preview 3D",
}: ThreeDPreviewProps) {
  const Colors = useColors();

  const allFiles: Record<string, string> =
    formatFiles && Object.keys(formatFiles).length > 0
      ? formatFiles
      : fileUrl && format
      ? { [format.toUpperCase()]: fileUrl }
      : {};

  const previewable = PREVIEWABLE.filter((f) => !!allFiles[f]);
  const defaultFormat = previewable[0] ?? "";

  const [visible,     setVisible]     = useState(false);
  const [selectedFmt, setSelectedFmt] = useState(defaultFormat);
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [viewerHtml,  setViewerHtml]  = useState<string | null>(null);
  const [webViewKey,  setWebViewKey]  = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setSelectedFmt(defaultFormat); }, [defaultFormat]);

  const hasPreview = previewable.length > 0;

  const fetchAndBuild = async (fmt: string) => {
    const url = allFiles[fmt];
    if (!url) { setPhase("error"); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPhase("fetching");
    setViewerHtml(null);

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = await res.arrayBuffer();
      const b64 = bufferToBase64(buf);
      if (ctrl.signal.aborted) return;
      setViewerHtml(buildViewerHtml(b64, fmt));
      setPhase("rendering");
      setWebViewKey((k) => k + 1);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setPhase("error");
    }
  };

  const handleOpen = () => {
    if (!hasPreview) return;
    setVisible(true);
    fetchAndBuild(selectedFmt);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setVisible(false);
    setPhase("idle");
    setViewerHtml(null);
  };

  const handleFormatSelect = (fmt: string) => {
    if (fmt === selectedFmt) return;
    setSelectedFmt(fmt);
    fetchAndBuild(fmt);
  };

  const handleRetry = () => fetchAndBuild(selectedFmt);

  return (
    <>
      {/* ── Button ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        disabled={!hasPreview}
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          backgroundColor: Colors.purple + "22",
          borderRadius: 12, paddingVertical: 13,
          borderWidth: 1, borderColor: Colors.purple + "66",
          opacity: hasPreview ? 1 : 0.4,
        }}
      >
        <Ionicons name="cube" size={18} color={Colors.purple} />
        <Text style={{ color: Colors.purple, fontSize: 14, fontWeight: "700" }}>
          {hasPreview
            ? `Visualizar em 3D (${selectedFmt || defaultFormat})`
            : "Prévia 3D indisponível para este formato"}
        </Text>
      </TouchableOpacity>

      {/* ── Fullscreen modal ─────────────────────────────────────────────────── */}
      <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0d1117" }} edges={["top", "bottom"]}>

          {/* Header */}
          <View style={{ backgroundColor: "#161b27", borderBottomWidth: 1, borderBottomColor: "#1e2d40" }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
              <TouchableOpacity onPress={handleClose} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Ionicons name="cube" size={17} color="#22d3ee" />
              <Text style={{ flex: 1, color: "#ffffff", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>{title}</Text>
            </View>

            {/* Format chips */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexDirection: "row" }}
            >
              {previewable.map((fmt) => {
                const sel = fmt === selectedFmt;
                return (
                  <TouchableOpacity
                    key={fmt}
                    onPress={() => handleFormatSelect(fmt)}
                    disabled={phase === "fetching"}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: sel ? "#7c3aed" : "#7c3aed22",
                      borderWidth: 1, borderColor: sel ? "#a855f7" : "#7c3aed55",
                    }}
                  >
                    <Text style={{ color: sel ? "#fff" : "#a78bfa", fontSize: 12, fontWeight: "700" }}>{fmt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>

            {/* Fetching file in RN */}
            {phase === "fetching" && (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={{ color: "#22d3ee", fontSize: 14, opacity: 0.8 }}>Baixando modelo...</Text>
              </View>
            )}

            {/* Fetch/render error */}
            {phase === "error" && (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
                  Não foi possível carregar o modelo
                </Text>
                <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center", lineHeight: 20 }}>
                  Verifique sua conexão e tente novamente.
                </Text>
                <TouchableOpacity
                  onPress={handleRetry}
                  activeOpacity={0.8}
                  style={{ backgroundColor: "#22d3ee", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
                >
                  <Text style={{ color: "#0d1117", fontWeight: "800" }}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* WebView (rendering phase) */}
            {phase === "rendering" && viewerHtml && (
              <WebView
                key={webViewKey}
                source={{ html: viewerHtml }}
                style={{ flex: 1, backgroundColor: "#0d1117" }}
                onError={() => setPhase("error")}
                onHttpError={() => setPhase("error")}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled={false}
                allowFileAccess={false}
                allowUniversalAccessFromFileURLs={false}
                mixedContentMode="never"
                renderToHardwareTextureAndroid
                startInLoadingState={false}
                onShouldStartLoadWithRequest={(req) =>
                  req.url === "about:blank" || req.url.startsWith("data:") ||
                  req.url.includes("cdnjs.cloudflare.com")
                }
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
