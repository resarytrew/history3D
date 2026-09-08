import { Box3, Color, DoubleSide, Mesh, MeshBasicMaterial, NoBlending, Object3D, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget } from 'three'

/** Baked from the actual exterior once per load; orbiting needs only one extra draw. */
export function createContactShadow(renderer: WebGLRenderer, root: Object3D) {
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root), center = box.getCenter(new Vector3())
  const width = box.max.x-box.min.x+0.16, depth = box.max.z-box.min.z+0.20
  const floor = box.min.y-0.006
  const target = new WebGLRenderTarget(1024, Math.max(128, Math.round(1024*depth/width)))
  const scratch = target.clone()
  const capture = new Scene(), clone = root.clone(true)
  capture.add(clone)
  const silhouette = new ShaderMaterial({
    side: DoubleSide, blending: NoBlending,
    uniforms: { floor: { value: floor } },
    vertexShader: 'varying float height; uniform float floor; void main(){vec4 p=modelMatrix*vec4(position,1.0);height=p.y-floor;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader: 'varying float height; void main(){gl_FragColor=vec4(1.0,1.0,1.0,exp(-max(0.0,height)*6.0));}',
  })
  capture.overrideMaterial = silhouette
  const camera = new OrthographicCamera(-width/2,width/2,depth/2,-depth/2,0.001,box.max.y-floor+1)
  camera.position.set(center.x,box.max.y+0.5,center.z); camera.up.set(0,0,-1)
  camera.lookAt(center.x,floor,center.z)
  const blur = new ShaderMaterial({
    depthTest: false, depthWrite: false, blending: NoBlending,
    uniforms: { source: { value: target.texture }, step: { value: new Vector2() } },
    vertexShader: 'varying vec2 texCoord; void main(){texCoord=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: `varying vec2 texCoord; uniform sampler2D source; uniform vec2 step;
      void main(){float a=0.0;float sum=0.0;for(int i=-8;i<=8;i++){float w=exp(-float(i*i)/18.0);a+=texture2D(source,texCoord+step*float(i)).a*w;sum+=w;}gl_FragColor=vec4(1.0,1.0,1.0,a/sum);}`,
  })
  const quadGeometry = new PlaneGeometry(2,2), blurScene = new Scene()
  blurScene.add(new Mesh(quadGeometry,blur))
  const previousTarget = renderer.getRenderTarget(), previousColor = renderer.getClearColor(new Color())
  const previousAlpha = renderer.getClearAlpha(), previousAutoClear = renderer.autoClear
  const shadowsEnabled = renderer.shadowMap.enabled, scissorTest = renderer.getScissorTest()
  let finished = false
  try {
    renderer.autoClear = true; renderer.shadowMap.enabled = false; renderer.setScissorTest(false)
    renderer.setClearColor(0xffffff,0); renderer.setRenderTarget(target); renderer.render(capture,camera)
    blur.uniforms.step.value.set(0.003/width,0)
    renderer.setRenderTarget(scratch); renderer.render(blurScene,camera)
    blur.uniforms.source.value = scratch.texture; blur.uniforms.step.value.set(0,0.003/depth)
    renderer.setRenderTarget(target); renderer.render(blurScene,camera)
    finished = true
  } finally {
    renderer.setRenderTarget(previousTarget); renderer.setClearColor(previousColor,previousAlpha)
    renderer.autoClear = previousAutoClear; renderer.shadowMap.enabled = shadowsEnabled; renderer.setScissorTest(scissorTest)
    // The clone shares the artifact's geometries and materials; never dispose those here.
    silhouette.dispose(); blur.dispose(); quadGeometry.dispose(); scratch.dispose()
    if (!finished) target.dispose()
  }
  const geometry = new PlaneGeometry(width,depth)
  const material = new MeshBasicMaterial({ map: target.texture, color: '#30332f', opacity: 0.23, transparent: true, depthWrite: false, toneMapped: false })
  const mesh = new Mesh(geometry,material); mesh.name = 'ArtifactContactShadow'
  mesh.rotation.x = -Math.PI/2; mesh.position.set(center.x,floor,center.z)
  return { mesh, dispose: () => { mesh.removeFromParent(); geometry.dispose(); material.dispose(); target.dispose() } }
}
