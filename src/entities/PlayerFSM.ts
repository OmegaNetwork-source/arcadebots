import Phaser from "phaser";
import FSM from "phaser3-rex-plugins/plugins/fsm.js";
import type { ArcadeBot } from "./ArcadeBot";

// Custom FSM class for managing player states
export class PlayerFSM extends FSM {
  scene: Phaser.Scene;
  player: ArcadeBot;

  constructor(scene: Phaser.Scene, player: ArcadeBot) {
    super({
      // IMPORTANT: Do NOT use `start: "state_name"` here
      // Reason: Using `start` config will set the initial state but will NOT trigger the enter_state() function
      // Instead, we call this.goto("state_name") after initialization to properly trigger enter_state()
      extend: {
        eventEmitter: new Phaser.Events.EventEmitter(),
      },
    });
    this.scene = scene;
    this.player = player;
    
    // Use goto to trigger enter_state function and properly initialize the player state
    this.goto("idle");
  }

  // Common death check method
  checkDeath(): boolean {
    if (this.player.health <= 0 && !this.player.isDead) {
      this.player.health = 0;
      this.player.isDead = true;
      this.goto("dying");
      return true;
    }

    // If player falls out of the world's bottom edge
    if (this.player.y > (this.scene as any).mapHeight + 100 && !this.player.isDead) {
      this.player.health = 0;
      this.player.isDead = true;
      this.player.dieSound?.play();
      this.scene.scene.launch("GameOverUIScene", {
        currentLevelKey: this.scene.scene.key,
      });
      return true;
    }
    
    return false;
  }

  // Idle state
  enter_idle(): void {
    this.player.setVelocityX(0);
    this.player.playAnimation(this.player.getAnimKey('idle'));
  }

  update_idle(): void {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;
    if (!cursors) return;
    
    // Left/right movement input detection
    if (cursors.left.isDown || cursors.right.isDown) {
      this.goto("moving");
    } 
    // Space key attack input detection
    else if (
      this.player.spaceKey &&
      Phaser.Input.Keyboard.JustDown(this.player.spaceKey)
    ) {
      this.goto("attacking");
    } 
    // Jump input detection (must be on ground)
    else if (cursors.up.isDown && this.player.body.blocked.down) {
      this.goto("jumping");
    }
  }

  // Moving state
  enter_moving(): void {
    this.player.playAnimation(this.player.getAnimKey('walk'));
  }

  update_moving(): void {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;
    if (!cursors) return;
    
    // Handle left/right movement
    if (cursors.left.isDown) {
      this.player.setVelocityX(-this.player.walkSpeed);
      this.player.facingDirection = "left";
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(this.player.walkSpeed);
      this.player.facingDirection = "right";
    } else {
      this.goto("idle");
      return;
    }

    // Update facing direction
    this.player.setFlipX(this.player.facingDirection === "left");

    // Attack and jump input detection
    if (
      this.player.spaceKey &&
      Phaser.Input.Keyboard.JustDown(this.player.spaceKey)
    ) {
      this.goto("attacking");
    } else if (cursors.up.isDown && this.player.body.blocked.down) {
      this.goto("jumping");
    }
  }

  // Jump state (includes up and down)
  enter_jumping(): void {
    // Only apply upward jump force when on ground
    if (this.player.body.blocked.down) {
      this.player.body.setVelocityY(-this.player.jumpPower);
      this.player.jumpSound?.play();
    }
    this.player.playAnimation(this.player.getAnimKey('jump_up'));
  }

  update_jumping(): void {
    if (this.checkDeath()) return;

    const cursors = this.player.cursors;
    if (!cursors) return;

    // Air movement control
    if (cursors.left.isDown) {
      this.player.setVelocityX(-this.player.walkSpeed);
      this.player.facingDirection = "left";
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(this.player.walkSpeed);
      this.player.facingDirection = "right";
    } else {
      this.player.setVelocityX(0);
    }

    // Update facing direction
    this.player.setFlipX(this.player.facingDirection === "left");

    // Choose jump up or down animation based on vertical velocity
    if (this.player.body.velocity.y > 0) {
      this.player.playAnimation(this.player.getAnimKey('jump_down'));
    }

    // Landing detection
    if (this.player.body.blocked.down) {
      if (cursors.left.isDown || cursors.right.isDown) {
        this.goto("moving");
      } else {
        this.goto("idle");
      }
      return;
    }

    // Air attack
    if (
      this.player.spaceKey &&
      Phaser.Input.Keyboard.JustDown(this.player.spaceKey)
    ) {
      this.goto("attacking");
    }
  }

  // Attack state
  enter_attacking(): void {
    this.player.isAttacking = true;
    this.player.setVelocityX(0);
    const attackAnim = this.player.getAnimKey('attack');
    this.player.playAnimation(attackAnim);
    this.player.slashSound?.play();
    this.player.currentMeleeTargets.clear();

    // State transition after attack animation completes
    this.player.once(`animationcomplete-${attackAnim}`, () => {
      this.player.isAttacking = false;
      this.player.currentMeleeTargets.clear();
      
      const cursors = this.player.cursors;
      if (!cursors) {
        this.goto("idle");
        return;
      }

      // Determine next state based on ground/air and input
      if (!this.player.body.blocked.down) {
        this.goto("jumping");
      } else if (cursors.left.isDown || cursors.right.isDown) {
        this.goto("moving");
      } else {
        this.goto("idle");
      }
    });
  }

  update_attacking(): void {
    if (this.checkDeath()) return;

    // Keep still during ground attacks, let gravity work naturally during air attacks
    if (this.player.body.blocked.down) {
      this.player.setVelocityX(0);
    }
  }

  // Hurt state
  enter_hurting(): void {
    this.player.setVelocityX(0);
    this.player.hurtSound?.play();

    // Hurt stun timer
    this.player.hurtingTimer = this.scene.time.delayedCall(this.player.hurtingDuration, () => {
      this.player.isHurting = false;
      
      const cursors = this.player.cursors;
      if (!cursors) {
        this.goto("idle");
        return;
      }

      if (!this.player.body.blocked.down) {
        this.goto("jumping");
      } else if (cursors.left.isDown || cursors.right.isDown) {
        this.goto("moving");
      } else {
        this.goto("idle");
      }
    });
  }

  // Death state
  enter_dying(): void {
    // Cleanup hurt timer if exists
    if (this.player.hurtingTimer) {
      this.player.hurtingTimer.destroy();
    }
    
    this.player.setVelocityX(0);
    this.player.dieSound?.play();
    const dieAnim = this.player.getAnimKey('die');
    this.player.playAnimation(dieAnim);

    // Launch game over UI when death animation completes
    this.player.once(`animationcomplete-${dieAnim}`, () => {
      this.scene.scene.launch("GameOverUIScene", {
        currentLevelKey: this.scene.scene.key,
      });
    });
  }
}
