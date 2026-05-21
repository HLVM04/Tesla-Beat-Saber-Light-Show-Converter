import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import type { LightEffect } from "./converter";
import {
  type Coordinate3D,
  type LightMetadata,
  LIGHT_METADATA,
  MODEL_S_COORDINATES,
  CYBERTRUCK_COORDINATES
} from "./lightCoordinates";

export class LightshowVisualizer {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;

  // 3D Objects
  private carGroup!: THREE.Group;
  private lightsMap: Map<string, THREE.Mesh[]> = new Map();
  private defaultMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private activeMaterials: Map<string, THREE.Material> = new Map();

  // State
  private lightEffects: Record<string, LightEffect[]> = {};
  private animationFrameId: number | null = null;
  private isAutoRotating: boolean = true;
  private isResettingCamera: boolean = false;
  private lastTime: number = 0;
  private lastTimeMs: number | null = null;

  // Loading Callback
  private onLoading?: (loading: boolean) => void;

  constructor(canvas: HTMLCanvasElement, onLoading?: (loading: boolean) => void) {
    this.canvas = canvas;
    this.onLoading = onLoading;
    
    this.initScene();

    // Create the car group which holds the loaded vehicle model and the programmatic light nodes
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    // Set up the Active glowing materials for different light types
    this.activeMaterials.set("white", new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.activeMaterials.set("ice-blue", new THREE.MeshBasicMaterial({ color: 0xcceeff }));
    this.activeMaterials.set("blue-signature", new THREE.MeshBasicMaterial({ color: 0xaaddff }));
    this.activeMaterials.set("amber", new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    this.activeMaterials.set("red", new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    this.activeMaterials.set("underglow-left", new THREE.MeshBasicMaterial({ color: 0xff00ff }));
    this.activeMaterials.set("underglow-right", new THREE.MeshBasicMaterial({ color: 0x00ffff }));

    // Default to loading the Model S
    this.loadCarModel("Model_S");

    this.startAnimationLoop();
  }

  /**
   * Initializes the Three.js 3D environment.
   */
  private initScene(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 450;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    // Enable premium tone mapping and increase exposure to boost general scene brightness beautifully
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65;

    // Scene
    this.scene = new THREE.Scene();
    // Let the canvas be fully transparent so the gorgeous premium light-gray CSS radial studio gradient backdrop shows through
    this.scene.background = null; 

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(-6, 3, 7);

    // Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.6; // slow orbital rotate

    // Listen to user interactions to pause auto-rotation temporarily
    this.controls.addEventListener("start", () => {
      this.isAutoRotating = false;
      this.isResettingCamera = false;
    });

    // Lights
    // Ambient light provides soft, balanced lighting for the entire scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1); 
    this.scene.add(ambientLight);

    // Hemisphere light simulates soft sky-to-ground gradient for natural showroom ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 0.9);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // Balanced 4-Point Directional Studio Lighting for elegant, soft highlights:
    // 1. Key Light (Front-Left-Above) - casts soft light from the front-left default camera angle
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(-8, 12, 10);
    this.scene.add(dirLight1);

    // 2. Fill Light (Front-Right-Above) - gently balances opposite side shadows
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(8, 10, 8);
    this.scene.add(dirLight2);

    // 3. Rim/Back Light (Rear-Left-Above) - soft edge highlights along the rear profile
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight3.position.set(-5, 8, -10);
    this.scene.add(dirLight3);

    // 4. Rim/Back Light 2 (Rear-Right-Above) - soft fill on the rear-right profile
    const dirLight4 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight4.position.set(5, 8, -10);
    this.scene.add(dirLight4);

    // Handle Resize
    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = (): void => {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight || 400;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  /**
   * Asynchronously loads the chosen high-fidelity Tesla vehicle model (Model S or Cybertruck)
   * and maps all the light elements to its chassis.
   */
  public loadCarModel(modelName: "Model_S" | "Cybertruck"): Promise<void> {
    if (this.onLoading) {
      this.onLoading(true);
    }

    this.clearCarModel();

    return new Promise<void>((resolve) => {
      const mtlLoader = new MTLLoader();
      const folderPath = `/models/${modelName}/`;
      const mtlFileName = modelName === "Model_S" ? "ModelS.mtl" : "Cybertruck.mtl";
      const objFileName = modelName === "Model_S" ? "ModelS.obj" : "Cybertruck.obj";

      mtlLoader.setPath(folderPath);
      mtlLoader.load(
        mtlFileName,
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath(folderPath);
          objLoader.load(
            objFileName,
            (object) => {
              try {
                // Compute bounding box to dynamically scale and center the loaded asset
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Scale the mesh so that its longest axis (length, X axis in the OBJ) matches the light node bounds
                const targetLength = modelName === "Model_S" ? 4.84 : 4.6;
                const scale = targetLength / size.x;

                // Center the car's local geometry relative to local 0,0,0
                object.position.set(-center.x, -center.y, -center.z);

                // Customize materials for a stunning premium paint finish and optimal visibility
                object.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    const mat = child.material as THREE.Material;
                    if (mat && 'color' in mat) {
                      const matName = mat.name;
                      const anyMat = mat as any;
                      
                      // Check for car body paint material names
                      const isModelSBody = modelName === "Model_S" && (matName.includes("BodySG") || matName.includes("BodySG1"));
                      const isCybertruckBody = modelName === "Cybertruck" && matName.includes("blinn3SG");
                      
                      if (isModelSBody) {
                        // Iconic vibrant bright Tesla Signature Red with soft glossy PBR highlights
                        anyMat.color.setHex(0xe31937); 
                        if ('metalness' in anyMat) anyMat.metalness = 0.1; 
                        if ('roughness' in anyMat) anyMat.roughness = 0.45; 
                        if ('shininess' in anyMat) anyMat.shininess = 35; 
                        if ('specular' in anyMat) anyMat.specular.setHex(0x1a1a1a); 
                      } else if (isCybertruckBody) {
                        // Cybertruck premium brushed stainless steel - bright metallic light gray
                        anyMat.color.setHex(0xe0e0e0); 
                        if ('metalness' in anyMat) anyMat.metalness = 0.85;
                        if ('roughness' in anyMat) anyMat.roughness = 0.28;
                        if ('shininess' in anyMat) anyMat.shininess = 75;
                        if ('specular' in anyMat) anyMat.specular.setHex(0xaaaaaa);
                      } else if (matName.includes("Windows_TopSG") || matName.includes("phong1SG")) {
                        // High-end dark tinted glass
                        anyMat.color.setHex(0x0a0f1d);
                        if ('transparent' in anyMat) anyMat.transparent = true;
                        if ('opacity' in anyMat) anyMat.opacity = 0.55;
                        if ('roughness' in anyMat) anyMat.roughness = 0.05;
                        if ('metalness' in anyMat) anyMat.metalness = 0.95;
                      } else if (
                        matName.includes("Exterior_AO_Dark") || 
                        matName.includes("lambert2SG") || 
                        matName.includes("BodySG2") ||
                        matName.includes("Arachnid21_Wheel_LFSG") ||
                        matName.includes("blinn4SG")
                      ) {
                        // Matte dark zinc trim and wheels
                        anyMat.color.setHex(0x3f3f46);
                        if ('roughness' in anyMat) anyMat.roughness = 0.9;
                        if ('metalness' in anyMat) anyMat.metalness = 0.05;
                        if ('shininess' in anyMat) anyMat.shininess = 10;
                        if ('specular' in anyMat) anyMat.specular.setHex(0x050505);
                      } else {
                        // Boost visibility on black default layers
                        if (anyMat.color.r === 0 && anyMat.color.g === 0 && anyMat.color.b === 0) {
                          anyMat.color.setHex(0x4b5563);
                        }
                      }
                    }
                  }
                });

                // Wrap in a model group for scaling and coordinate mapping rotation
                const modelWrapper = new THREE.Group();
                modelWrapper.add(object);
                modelWrapper.scale.set(scale, scale, scale);

                // Rotate by -90 degrees (-Math.PI / 2) around Y so the local +X axis (front)
                // maps perfectly to the scene's +Z axis (front), aligning lights exactly to the bumpers.
                modelWrapper.rotation.y = -Math.PI / 2;

                // Position vertically so the wheels touch the grid floor perfectly (y = -0.55)
                modelWrapper.position.y = -0.52 + (size.y / 2 * scale);

                this.carGroup.add(modelWrapper);

                // Build the custom lights optimized for this model using exact CAD mesh coordinates
                this.buildLightsAligned(modelName, modelWrapper, center, scale);

                // Fit the loaded model perfectly inside the camera viewport
                this.fitModelToViewport();

                if (this.onLoading) {
                  this.onLoading(false);
                }
                resolve();
              } catch (err) {
                console.error("Error setting up loaded model, running fallback:", err);
                this.buildFallbackModel();
                if (this.onLoading) {
                  this.onLoading(false);
                }
                resolve();
              }
            },
            undefined,
            (err) => {
              console.error("Error loading OBJ model, running fallback:", err);
              this.buildFallbackModel();
              if (this.onLoading) {
                this.onLoading(false);
              }
              resolve();
            }
          );
        },
        undefined,
        (err) => {
          console.error("Error loading MTL materials, running fallback:", err);
          this.buildFallbackModel();
          if (this.onLoading) {
            this.onLoading(false);
          }
          resolve();
        }
      );
    });
  }

  /**
   * Clears the current vehicle model meshes and programmatically registered lights to avoid memory leaks.
   */
  private clearCarModel(): void {
    // Dispose resources of child meshes inside the car group
    this.carGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    // Remove children from group
    while (this.carGroup.children.length > 0) {
      this.carGroup.remove(this.carGroup.children[0]);
    }

    this.lightsMap.clear();
    this.defaultMaterials.clear();
  }

  /**
   * Resilient fallback programmatically constructing a beautiful glassmorphic car if assets fail to load.
   */
  private buildFallbackModel(): void {
    this.clearCarModel();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.4,
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.5,
    });

    // Lower Chassis base
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.4, 4.2);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = -0.15;
    this.carGroup.add(chassis);

    // Cabin Glass top
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.45, 2.3);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.25, -0.2);
    this.carGroup.add(cabin);

    // Nose Cone slope
    const noseGeo = new THREE.BoxGeometry(1.76, 0.35, 0.8);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, -0.15, 2.1);
    nose.rotation.x = -0.15;
    this.carGroup.add(nose);

    // Rear trunk/spoiler area
    const trunkGeo = new THREE.BoxGeometry(1.76, 0.38, 0.8);
    const trunk = new THREE.Mesh(trunkGeo, bodyMat);
    trunk.position.set(0, -0.05, -2.1);
    trunk.rotation.x = 0.1;
    this.carGroup.add(trunk);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      [-0.92, -0.3, 1.3],
      [0.92, -0.3, 1.3],
      [-0.92, -0.3, -1.3],
      [0.92, -0.3, -1.3],
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      this.carGroup.add(wheel);

      const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.33, 12);
      capGeo.rotateZ(Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, darkTrimMat);
      cap.position.set(pos[0], pos[1], pos[2]);
      this.carGroup.add(cap);
    });

    // Default to Model S lights setup
    this.buildLights("Model_S");

    // Fit the fallback model perfectly inside the camera viewport
    this.fitModelToViewport();
  }

  /**
   * Spawns physical visualizer lights mapped to standard Tesla Light Show channels
   * using exact XML model coordinates aligned perfectly in the CAD mesh's local space.
   */
  private buildLightsAligned(
    modelName: "Model_S" | "Cybertruck",
    modelWrapper: THREE.Group,
    center: THREE.Vector3,
    scale: number
  ): void {
    const coordsMap = modelName === "Model_S" ? MODEL_S_COORDINATES : CYBERTRUCK_COORDINATES;

    for (const [channelName, coords] of Object.entries(coordsMap)) {
      const metadata = LIGHT_METADATA[channelName];
      if (!metadata) continue;

      coords.forEach((coord: Coordinate3D) => {
        this.createLightNodeAligned(
          channelName,
          metadata,
          coord.x,
          coord.y,
          coord.z,
          center,
          scale,
          modelWrapper
        );
      });
    }
  }

  /**
   * Helper to create a perfectly aligned light node in the local coordinate space of the model.
   */
  private createLightNodeAligned(
    channelName: string,
    metadata: LightMetadata,
    x: number,
    y: number,
    z: number,
    center: THREE.Vector3,
    scale: number,
    modelWrapper: THREE.Group
  ): void {
    const glowColorType = metadata.glowColorType;

    // Dark Off material colors
    let offColor = 0x333333;
    if (glowColorType === "red") offColor = 0x3d0808;
    if (glowColorType === "amber") offColor = 0x3d2000;

    const offMaterial = new THREE.MeshStandardMaterial({
      color: offColor,
      roughness: 0.3,
      metalness: 0.1,
    });

    let geometry: THREE.BufferGeometry;
    if (metadata.shape === "sphere") {
      const radius = metadata.radius || 0.04;
      geometry = new THREE.SphereGeometry(radius, 8, 8);
    } else {
      const w = metadata.width || 0.1;
      const h = metadata.height || 0.02;
      const d = metadata.depth || 0.02;
      geometry = new THREE.BoxGeometry(w, h, d);
    }

    const mesh = new THREE.Mesh(geometry, offMaterial);

    // Compute coordinate inside local model space (relative to centered mesh origin)
    // Scale slightly outwards to prevent any clipping on the mesh surfaces
    const pushFactorX = 1.015; // 1.5% longitudinal push
    const pushFactorY = 1.015; // 1.5% vertical push
    const pushFactorZ = 1.04;  // 4% lateral push (keeps headlights & repeaters clear of fenders)
    const x_local = (x - center.x) * pushFactorX;
    const y_local = (y - center.y) * pushFactorY;
    const z_local = (z - center.z) * pushFactorZ;
    mesh.position.set(x_local, y_local, z_local);

    // Invert the parent modelWrapper's scale so the light geometry remains at its exact real-world dimensions
    mesh.scale.set(1.0 / scale, 1.0 / scale, 1.0 / scale);

    // Add as a child of modelWrapper so it rotates and transforms dynamically with the car mesh!
    modelWrapper.add(mesh);

    // Save mappings
    if (!this.lightsMap.has(channelName)) {
      this.lightsMap.set(channelName, []);
    }
    this.lightsMap.get(channelName)!.push(mesh);
    this.defaultMaterials.set(mesh, offMaterial);

    // Associate active glow material type
    mesh.userData = { glowColorType };
  }

  /**
   * Spawns physical visualizer lights mapped to standard Tesla Light Show channels.
   */
  private buildLights(modelName: "Model_S" | "Cybertruck"): void {
    if (modelName === "Model_S") {
      this.buildLightsModelS();
    } else {
      this.buildLightsCybertruck();
    }
  }

  /**
   * Light coordinates configuration for Tesla Model S
   */
  private buildLightsModelS(): void {
    // Front Lights
    this.createLightNode("Left Outer Main Beam", new THREE.SphereGeometry(0.06, 8, 8), -0.76, 0.05, 2.38, "ice-blue");
    this.createLightNode("Left Inner Main Beam", new THREE.SphereGeometry(0.06, 8, 8), -0.54, 0.05, 2.42, "ice-blue");
    this.createLightNode("Left Signature", new THREE.BoxGeometry(0.28, 0.03, 0.03), -0.65, -0.01, 2.44, "blue-signature");
    this.createLightNode("Left Front Turn", new THREE.SphereGeometry(0.05, 8, 8), -0.84, 0.02, 2.32, "amber");
    this.createLightNode("Left Front Fog", new THREE.SphereGeometry(0.05, 8, 8), -0.7, -0.25, 2.32, "white");
    this.createLightNode("Left Aux Park", new THREE.SphereGeometry(0.04, 8, 8), -0.4, -0.22, 2.4, "white");
    this.createLightNode("Left Side Marker", new THREE.SphereGeometry(0.03, 8, 8), -0.91, 0.02, 2.1, "amber");

    this.createLightNode("Right Outer Main Beam", new THREE.SphereGeometry(0.06, 8, 8), 0.76, 0.05, 2.38, "ice-blue");
    this.createLightNode("Right Inner Main Beam", new THREE.SphereGeometry(0.06, 8, 8), 0.54, 0.05, 2.42, "ice-blue");
    this.createLightNode("Right Signature", new THREE.BoxGeometry(0.28, 0.03, 0.03), 0.65, -0.01, 2.44, "blue-signature");
    this.createLightNode("Right Front Turn", new THREE.SphereGeometry(0.05, 8, 8), 0.84, 0.02, 2.32, "amber");
    this.createLightNode("Right Front Fog", new THREE.SphereGeometry(0.05, 8, 8), 0.7, -0.25, 2.32, "white");
    this.createLightNode("Right Aux Park", new THREE.SphereGeometry(0.04, 8, 8), 0.4, -0.22, 2.4, "white");
    this.createLightNode("Right Side Marker", new THREE.SphereGeometry(0.03, 8, 8), 0.91, 0.02, 2.1, "amber");

    // Fender Repeaters
    this.createLightNode("Left Side Repeater", new THREE.BoxGeometry(0.02, 0.04, 0.08), -0.91, 0.08, 0.85, "amber");
    this.createLightNode("Right Side Repeater", new THREE.BoxGeometry(0.02, 0.04, 0.08), 0.91, 0.08, 0.85, "amber");

    // Rear Lights
    this.createLightNode("Left Tail", new THREE.BoxGeometry(0.2, 0.06, 0.04), -0.75, 0.12, -2.41, "red");
    this.createLightNode("Left Rear Turn", new THREE.SphereGeometry(0.05, 8, 8), -0.86, 0.12, -2.39, "amber");
    this.createLightNode("Right Tail", new THREE.BoxGeometry(0.2, 0.06, 0.04), 0.75, 0.12, -2.41, "red");
    this.createLightNode("Right Rear Turn", new THREE.SphereGeometry(0.05, 8, 8), 0.86, 0.12, -2.39, "amber");

    // Brake Lights
    this.createLightNode("Brake Lights", new THREE.BoxGeometry(0.18, 0.04, 0.02), -0.75, 0.15, -2.42, "red");
    this.createLightNode("Brake Lights", new THREE.BoxGeometry(0.18, 0.04, 0.02), 0.75, 0.15, -2.42, "red");
    this.createLightNode("Brake Lights", new THREE.BoxGeometry(0.4, 0.02, 0.02), 0, 0.42, -1.25, "red"); // Center High Mount

    // License Plate
    this.createLightNode("License Plate", new THREE.SphereGeometry(0.03, 8, 8), 0.0, -0.15, -2.38, "white");

    // Underglow
    this.createLightNode("Left Channel 4", new THREE.BoxGeometry(0.05, 0.02, 1.2), -0.8, -0.42, 0.5, "underglow-left");
    this.createLightNode("Left Channel 5", new THREE.BoxGeometry(0.05, 0.02, 1.2), -0.8, -0.42, -0.5, "underglow-left");
    this.createLightNode("Left Channel 6", new THREE.BoxGeometry(0.05, 0.02, 0.6), -0.8, -0.42, 1.3, "underglow-left");

    this.createLightNode("Right Channel 4", new THREE.BoxGeometry(0.05, 0.02, 1.2), 0.8, -0.42, 0.5, "underglow-right");
    this.createLightNode("Right Channel 5", new THREE.BoxGeometry(0.05, 0.02, 1.2), 0.8, -0.42, -0.5, "underglow-right");
    this.createLightNode("Right Channel 6", new THREE.BoxGeometry(0.05, 0.02, 0.6), 0.8, -0.42, 1.3, "underglow-right");
  }

  /**
   * Light coordinates configuration for Tesla Cybertruck
   */
  private buildLightsCybertruck(): void {
    // Cybertruck continuous light bar segmentation
    this.createLightNode("Left Outer Main Beam", new THREE.BoxGeometry(0.15, 0.02, 0.02), -0.65, 0.28, 2.3, "ice-blue");
    this.createLightNode("Left Inner Main Beam", new THREE.BoxGeometry(0.15, 0.02, 0.02), -0.35, 0.28, 2.3, "ice-blue");
    this.createLightNode("Left Signature", new THREE.BoxGeometry(0.2, 0.02, 0.02), -0.15, 0.28, 2.3, "blue-signature");
    this.createLightNode("Left Front Turn", new THREE.BoxGeometry(0.1, 0.02, 0.02), -0.8, 0.28, 2.28, "amber");
    this.createLightNode("Left Front Fog", new THREE.SphereGeometry(0.05, 8, 8), -0.6, -0.12, 2.25, "white");
    this.createLightNode("Left Aux Park", new THREE.BoxGeometry(0.1, 0.02, 0.02), -0.05, 0.28, 2.3, "white");
    this.createLightNode("Left Side Marker", new THREE.SphereGeometry(0.03, 8, 8), -0.9, 0.28, 2.2, "amber");

    this.createLightNode("Right Outer Main Beam", new THREE.BoxGeometry(0.15, 0.02, 0.02), 0.65, 0.28, 2.3, "ice-blue");
    this.createLightNode("Right Inner Main Beam", new THREE.BoxGeometry(0.15, 0.02, 0.02), 0.35, 0.28, 2.3, "ice-blue");
    this.createLightNode("Right Signature", new THREE.BoxGeometry(0.2, 0.02, 0.02), 0.15, 0.28, 2.3, "blue-signature");
    this.createLightNode("Right Front Turn", new THREE.BoxGeometry(0.1, 0.02, 0.02), 0.8, 0.28, 2.28, "amber");
    this.createLightNode("Right Front Fog", new THREE.SphereGeometry(0.05, 8, 8), 0.6, -0.12, 2.25, "white");
    this.createLightNode("Right Aux Park", new THREE.BoxGeometry(0.1, 0.02, 0.02), 0.05, 0.28, 2.3, "white");
    this.createLightNode("Right Side Marker", new THREE.SphereGeometry(0.03, 8, 8), 0.9, 0.28, 2.2, "amber");

    // Fender Repeaters
    this.createLightNode("Left Side Repeater", new THREE.BoxGeometry(0.02, 0.04, 0.08), -0.95, 0.15, 0.9, "amber");
    this.createLightNode("Right Side Repeater", new THREE.BoxGeometry(0.02, 0.04, 0.08), 0.95, 0.15, 0.9, "amber");

    // Rear tailgate red strip
    this.createLightNode("Left Tail", new THREE.BoxGeometry(0.3, 0.02, 0.02), -0.5, 0.35, -2.3, "red");
    this.createLightNode("Left Rear Turn", new THREE.BoxGeometry(0.15, 0.02, 0.02), -0.8, 0.35, -2.29, "amber");
    this.createLightNode("Right Tail", new THREE.BoxGeometry(0.3, 0.02, 0.02), 0.5, 0.35, -2.3, "red");
    this.createLightNode("Right Rear Turn", new THREE.BoxGeometry(0.15, 0.02, 0.02), 0.8, 0.35, -2.29, "amber");

    // Brake Lights (overlaps Tail strip + Center Mount)
    this.createLightNode("Brake Lights", new THREE.BoxGeometry(0.2, 0.03, 0.02), -0.7, 0.35, -2.31, "red");
    this.createLightNode("Brake Lights", new THREE.BoxGeometry(0.2, 0.03, 0.02), 0.7, 0.35, -2.31, "red");
    this.createLightNode("Brake Lights", new THREE.BoxGeometry(0.3, 0.02, 0.02), 0, 0.58, -1.05, "red"); // Roof High Mount

    // License Plate
    this.createLightNode("License Plate", new THREE.SphereGeometry(0.03, 8, 8), 0.0, -0.18, -2.28, "white");

    // Underglow (slightly wider side bars)
    this.createLightNode("Left Channel 4", new THREE.BoxGeometry(0.05, 0.02, 1.2), -0.9, -0.38, 0.5, "underglow-left");
    this.createLightNode("Left Channel 5", new THREE.BoxGeometry(0.05, 0.02, 1.2), -0.9, -0.38, -0.5, "underglow-left");
    this.createLightNode("Left Channel 6", new THREE.BoxGeometry(0.05, 0.02, 0.6), -0.9, -0.38, 1.3, "underglow-left");

    this.createLightNode("Right Channel 4", new THREE.BoxGeometry(0.05, 0.02, 1.2), 0.9, -0.38, 0.5, "underglow-right");
    this.createLightNode("Right Channel 5", new THREE.BoxGeometry(0.05, 0.02, 1.2), 0.9, -0.38, -0.5, "underglow-right");
    this.createLightNode("Right Channel 6", new THREE.BoxGeometry(0.05, 0.02, 0.6), 0.9, -0.38, 1.3, "underglow-right");
  }

  /**
   * Helper to create a 3D light element, map it to a physical channel, and register its materials.
   */
  private createLightNode(
    channelName: string,
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    glowColorType: string
  ): void {
    // Dark Off material colors
    let offColor = 0x333333;
    if (glowColorType === "red") offColor = 0x3d0808;
    if (glowColorType === "amber") offColor = 0x3d2000;
    if (glowColorType === "underglow-left" || glowColorType === "underglow-right") {
      offColor = 0x0a0a0a; // nearly black when off
    }

    const offMaterial = new THREE.MeshStandardMaterial({
      color: offColor,
      roughness: 0.3,
      metalness: 0.1,
      transparent: glowColorType.startsWith("underglow"),
      opacity: glowColorType.startsWith("underglow") ? 0.0 : 1.0,
    });

    const mesh = new THREE.Mesh(geometry, offMaterial);
    mesh.position.set(x, y, z);
    this.carGroup.add(mesh);

    // Save mapping
    if (!this.lightsMap.has(channelName)) {
      this.lightsMap.set(channelName, []);
    }
    this.lightsMap.get(channelName)!.push(mesh);
    this.defaultMaterials.set(mesh, offMaterial);

    // Associate active glow material type
    mesh.userData = { glowColorType };
  }

  /**
   * Updates the visualizer with the new light show timings.
   */
  public setLightEffects(effects: Record<string, LightEffect[]>): void {
    this.lightEffects = effects;
    this.lastTimeMs = null;
    this.resetAllLights();
  }

  /**
   * Resets all light nodes to their default "Off" material.
   */
  private resetAllLights(): void {
    this.lightsMap.forEach((meshes) => {
      meshes.forEach((mesh) => {
        mesh.material = this.defaultMaterials.get(mesh)!;
      });
    });
  }

  /**
   * Triggers the light updates based on the exact elapsed playback time in ms.
   */
  public updatePlaybackTime(timeMs: number): void {
    if (!this.lightEffects) return;

    const lastTime = this.lastTimeMs !== null ? this.lastTimeMs : timeMs;
    this.lastTimeMs = timeMs;

    // Normal forward playback step is positive and reasonably small
    const isNormalPlayback = timeMs > lastTime && (timeMs - lastTime) < 200;

    this.lightsMap.forEach((meshes, channelName) => {
      const activeEffects = this.lightEffects[channelName] || [];
      // Check if current time falls within any active period, or if the period was crossed in this frame step
      const isActive = activeEffects.some((effect) => {
        if (isNormalPlayback) {
          return effect.startTime <= timeMs && effect.endTime >= lastTime;
        } else {
          return timeMs >= effect.startTime && timeMs <= effect.endTime;
        }
      });

      meshes.forEach((mesh) => {
        if (isActive) {
          const glowType = mesh.userData.glowColorType;
          mesh.material = this.activeMaterials.get(glowType) || this.activeMaterials.get("white")!;
        } else {
          mesh.material = this.defaultMaterials.get(mesh)!;
        }
      });
    });
  }

  /**
   * Helper to calculate the perfect fitted camera position coordinate for the default view direction (-6, 3, 7).
   */
  private getFittedDefaultCameraPosition(): THREE.Vector3 {
    if (!this.carGroup) return new THREE.Vector3(-6, 3, 7);

    // Save current camera position, clip planes, and controls state
    const oldPos = this.camera.position.clone();
    const oldTarget = this.controls.target.clone();
    const oldNear = this.camera.near;
    const oldFar = this.camera.far;
    const oldMinDist = this.controls.minDistance;
    const oldMaxDist = this.controls.maxDistance;

    // Temporarily set camera to default position and center target
    this.camera.position.set(-6, 3, 7);
    this.controls.target.set(0, 0, 0);

    // Run viewport fit calculation
    this.fitModelToViewport();

    // Read calculated fitted position
    const fittedPos = this.camera.position.clone();

    // Restore camera position, clip planes, and controls state
    this.camera.position.copy(oldPos);
    this.controls.target.copy(oldTarget);
    this.camera.near = oldNear;
    this.camera.far = oldFar;
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = oldMinDist;
    this.controls.maxDistance = oldMaxDist;
    this.controls.update();

    return fittedPos;
  }

  /**
   * Camera rotating loop + WebGL rendering
   */
  private startAnimationLoop(): void {
    const animate = (timestamp: number) => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (this.lastTime === 0) this.lastTime = timestamp;
      const delta = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      // Sync autoRotate property of controls with state
      this.controls.autoRotate = this.isAutoRotating && !this.isResettingCamera;

      if (this.isResettingCamera) {
        const targetPos = this.getFittedDefaultCameraPosition();
        
        // Smoothly ease camera position and look-at target
        this.camera.position.lerp(targetPos, delta * 5.0);
        this.controls.target.lerp(new THREE.Vector3(0, 0, 0), delta * 5.0);
        
        // Check if we are very close to finishing the transition
        const posDist = this.camera.position.distanceTo(targetPos);
        if (posDist < 0.01) {
          this.camera.position.copy(targetPos);
          this.controls.target.set(0, 0, 0);
          this.isResettingCamera = false;
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Resets the camera orientation and enables auto-rotation back.
   */
  public resetCameraView(): void {
    if (!this.carGroup) return;
    this.isResettingCamera = true;
    this.isAutoRotating = true;
  }

  /**
   * Fits the loaded 3D vehicle model perfectly within the camera viewport.
   */
  public fitModelToViewport(): void {
    if (!this.carGroup) return;

    // Ensure renderer and camera aspect ratios are perfectly up-to-date
    this.handleResize();

    const box = new THREE.Box3().setFromObject(this.carGroup);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());

    // Corners of the model bounding box
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    // Determine target viewing direction
    const currentDir = new THREE.Vector3().subVectors(this.camera.position, center);
    if (currentDir.lengthSq() < 0.01) {
      currentDir.set(-1.2, 0.6, 1.4); // premium default 3/4 front-left perspective
    }
    currentDir.normalize();

    // Reconstruct coordinate system axes relative to camera
    const forward = currentDir.clone().negate(); // points from camera to center
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
    const camUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    // Perspective camera frustum angle calculation
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const halfFovRad = fovRad / 2;
    const tanHalfFov = Math.tan(halfFovRad);
    const tanHalfFovHorizontal = tanHalfFov * this.camera.aspect;

    // Calculate exact minimum distance required to fit every single box corner in viewport
    let maxDistance = 0;
    for (const corner of corners) {
      const v = new THREE.Vector3().subVectors(corner, center);
      const x_cam = v.dot(right);
      const y_cam = v.dot(camUp);
      const z_cam = v.dot(forward);

      const d_vert = z_cam + Math.abs(y_cam) / tanHalfFov;
      const d_horiz = z_cam + Math.abs(x_cam) / tanHalfFovHorizontal;

      maxDistance = Math.max(maxDistance, d_vert, d_horiz);
    }

    // Apply tight, gorgeous showroom framing (highly zoomed-in default)
    // 1.02 multiplier provides a perfect 2% safe boundary padding margin
    const distance = maxDistance * 1.02;

    this.camera.position.copy(currentDir.multiplyScalar(distance).add(center));
    this.controls.target.copy(center);
    
    // Adjust camera clipping planes dynamically based on scale
    this.camera.near = Math.max(0.1, distance / 100);
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();
    
    // Constrain orbit controls nicely based on the calculated optimal fit distance
    this.controls.minDistance = distance * 0.4;
    this.controls.maxDistance = distance * 2.5;
    this.controls.update();
  }

  /**
   * Destroys the WebGL context, resize listeners, and animation loop.
   */
  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();

    // Traverse scene and clean materials/geometries to avoid memory leaks
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();

      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else {
        object.material.dispose();
      }
    });

    this.defaultMaterials.clear();
    this.activeMaterials.forEach((mat) => mat.dispose());
    this.activeMaterials.clear();
  }
}
