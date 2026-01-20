import Phaser from "phaser";
import * as utils from "../utils";

// Bullet class for player gun
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  public damage: number;
  public speed: number;
  public lifetime: number;
  public spawnTime: number;
  public direction: number; // 1 = right, -1 = left

  constructor(scene: Phaser.Scene, x: number, y: number, direction: number) {
    super(scene, x, y, "arcade_bot_bullet");

    this.damage = 25;
    this.speed = 600;
    this.lifetime = 2000; // 2 seconds before auto-destroy
    this.direction = direction;
    this.spawnTime = scene.time.now;

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize scale and size - bullet is small
    utils.initScale(this, { x: 0.5, y: 0.5 }, 24, 12);

    // Set physics properties
    this.body.setAllowGravity(false);

    // Flip if going left
    if (direction < 0) {
      this.setFlipX(true);
    }

    // Set depth
    this.setDepth(10);
  }

  // Call this AFTER adding to group
  public fire(): void {
    // Set velocity after being added to group
    this.body.setVelocityX(this.speed * this.direction);
    
    // Play shoot sound
    this.scene.sound.play("gun_shoot", { volume: 0.3 });
  }

  // Update - check lifetime
  public update(): void {
    if (!this.active) return;

    // Check if bullet exceeded lifetime
    if (this.scene.time.now - this.spawnTime > this.lifetime) {
      this.destroy();
      return;
    }

    // Check if bullet is out of bounds
    const bounds = this.scene.physics.world.bounds;
    if (this.x < bounds.x - 50 || this.x > bounds.x + bounds.width + 50) {
      this.destroy();
    }
  }
}
