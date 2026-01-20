import Phaser from "phaser";
import * as utils from "../utils";

// Blood particle for hit and death effects
export class BloodParticle extends Phaser.GameObjects.Image {
  public velocityX: number;
  public velocityY: number;
  public gravity: number;
  public lifetime: number;
  public age: number;
  public fadeSpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "blood_particle");
    
    scene.add.existing(this);
    
    // Initialize with small size
    utils.initScale(this, { x: 0.5, y: 0.5 }, 8, 8);
    
    // Random velocity for spray effect
    this.velocityX = Phaser.Math.Between(-150, 150);
    this.velocityY = Phaser.Math.Between(-250, -50);
    this.gravity = 600;
    this.lifetime = Phaser.Math.Between(500, 1000);
    this.age = 0;
    this.fadeSpeed = 1 / this.lifetime;
    
    // Random rotation
    this.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
    
    // Set depth above most objects
    this.setDepth(100);
    
    // Force pure bright red blood color - override any image colors
    // Use pure red tint (0xff0000) to ensure blood is always red regardless of source image
    const redTints = [0xff0000, 0xdd0000, 0xcc0000, 0xee0000, 0xbb0000];
    const randomTint = redTints[Phaser.Math.Between(0, redTints.length - 1)];
    this.setTint(randomTint);
    this.setTintFill(randomTint);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    
    // Apply physics
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;
    this.velocityY += this.gravity * dt;
    
    // Add some drag
    this.velocityX *= 0.99;
    
    // Age and fade
    this.age += delta;
    const lifeRatio = 1 - (this.age / this.lifetime);
    this.setAlpha(lifeRatio);
    
    // Destroy when expired
    if (this.age >= this.lifetime) {
      this.destroy();
    }
  }
}

// Blood effect manager
export class BloodEffectManager {
  public scene: Phaser.Scene;
  public particles: BloodParticle[];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.particles = [];
  }

  // Spawn blood particles at position
  spawnBlood(x: number, y: number, count: number = 8, isDeathEffect: boolean = false): void {
    const particleCount = isDeathEffect ? count * 2 : count;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new BloodParticle(this.scene, x, y);
      
      // Death effect has bigger spread
      if (isDeathEffect) {
        particle.velocityX = Phaser.Math.Between(-250, 250);
        particle.velocityY = Phaser.Math.Between(-350, -100);
        particle.lifetime = Phaser.Math.Between(800, 1500);
        // Bigger particles for death
        utils.initScale(particle, { x: 0.5, y: 0.5 }, Phaser.Math.Between(10, 16), Phaser.Math.Between(10, 16));
      }
      
      this.particles.push(particle);
    }
  }

  // Update all particles
  update(time: number, delta: number): void {
    // Update and clean up destroyed particles
    this.particles = this.particles.filter(particle => {
      if (particle.active) {
        particle.update(time, delta);
        return true;
      }
      return false;
    });
  }

  // Clean up all particles
  destroy(): void {
    this.particles.forEach(particle => particle.destroy());
    this.particles = [];
  }
}
