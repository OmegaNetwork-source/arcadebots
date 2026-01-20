import Phaser from "phaser";
import * as utils from "../utils";

export type PickupType = "health" | "gun" | "jetpack";

// Base Pickup class for collectible items
export class Pickup extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  
  public pickupType: PickupType;
  public pickupValue: number;
  public bobTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PickupType) {
    let textureKey: string;
    if (type === "health") {
      textureKey = "health_pack";
    } else if (type === "gun") {
      textureKey = "gun_pickup";
    } else {
      textureKey = "jetpack_pickup";
    }
    super(scene, x, y, textureKey);

    this.pickupType = type;
    this.pickupValue = type === "health" ? 30 : 1; // health restores 30 HP, others give 1

    // Add to scene and physics system
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize scale and size
    const displaySize = type === "health" ? 40 : (type === "gun" ? 48 : 50);
    utils.initScale(this, { x: 0.5, y: 1.0 }, displaySize, displaySize);

    // Set physics properties
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    // Set depth
    this.setDepth(5);

    // Add bobbing animation
    this.createBobAnimation();

    // Add glow effect
    this.createGlowEffect();
  }

  // Create bobbing animation
  private createBobAnimation(): void {
    const startY = this.y;
    this.bobTween = this.scene.tweens.add({
      targets: this,
      y: startY - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  // Create glow effect
  private createGlowEffect(): void {
    // Add a subtle scale pulse
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.1,
      scaleY: this.scaleY * 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  // Called when picked up
  public collect(): void {
    // Stop animations
    if (this.bobTween) {
      this.bobTween.stop();
    }

    // Play pickup animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.scaleX * 1.5,
      scaleY: this.scaleY * 1.5,
      duration: 200,
      onComplete: () => {
        this.destroy();
      }
    });

    // Play appropriate sound
    let soundKey: string;
    if (this.pickupType === "health") {
      soundKey = "health_pickup";
    } else if (this.pickupType === "gun") {
      soundKey = "weapon_pickup";
    } else {
      soundKey = "jetpack_pickup_sound";
    }
    this.scene.sound.play(soundKey, { volume: 0.4 });
  }

  // Cleanup
  public destroy(fromScene?: boolean): void {
    if (this.bobTween) {
      this.bobTween.stop();
    }
    super.destroy(fromScene);
  }
}
