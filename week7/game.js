/*
/For this assignment, I've used some of the code from lecture source code as well as ChatGPT. 
I espcially use chatgpt when i want to implement some function but at the same time cannot really find any other sources to learn from.
Youtube: https://youtu.be/VE0IOvKv_Bc?si=HRUatoC6pHZELiD1 
This one is veritcally shooting so wasn't fully helpful with horizontal shooting that much.

Game play
Our goal is to collect normal stars and special stars while shooting the enemies who steal our stars. If they manage to steal more than
three stars, we lose. The stars with black background are normal stars and give one point while the ones without a black background are 
special stars and give us 3 points each.
*/

let game;

const gameOptions = {
    dudeGravity: 500, //I set gravity low here since we don't really need that high jumps.
    dudeSpeed: 300
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#112211",
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1000,
            height: window.innerHeight,
        },
        pixelArt: true,
        physics: {
            default: "arcade",
            arcade: {
                gravity: {
                    y: 0
                }
            }
        },
        scene: PlayGame
    }

    game = new Phaser.Game(gameConfig)
    window.focus();
}



class PlayGame extends Phaser.Scene {
    constructor() {
        super("PlayGame")

        //Here, we set both score and stole stars to zero since we'll be counting.
        this.score = 0;
        this.stolenStars = 0;
    }


    //This function is to load all the assets. Some of them are from itch.io. Some pictures have background and I didn't know how to remove it
    // so a bit ugly.

    preload() {

        this.load.image("ground", "assets/platform.png");
        this.load.image("sky", "assets/background/background_layer_1.png"); // Update with your path
        this.load.image("star", "assets/ss.png");
        this.load.image("specialstar", "assets/star.png");
        this.load.spritesheet("dude", "assets/dude.png", { frameWidth: 32, frameHeight: 48 });
        this.load.image("enemy","assets/Picture1.jpg");
        this.load.image("fireball", "assets/shot.png");
    }

    create() {

        this.stolenStars = 0;
        // We add background here. I want to make sure the background stretches out wide.
        this.add.image(800, 250, 'sky').setScale(5);
        
        // We have to create a static platform.
        this.platforms = this.physics.add.staticGroup();

        // Here, we create the ground to look like our character is walking on the ground.
        this.platforms.create(500, 665, 'ground').setScale(7, 2).refreshBody();

        // This is where we add our character here. I wanted to use a little cat but I didn't know how to work around with spritesheet.
        //Because the format is a bit different from Phaser website.
        this.player = this.physics.add.sprite(100, 450, 'dude');

        // Here, we add some player physics so that the dude would bounce off a bit when he hit the ground.
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.body.gravity.y = gameOptions.dudeGravity;

        // This is the animation for the character's movement. This is when we want to go left. 
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        // This is the animation for the character's movement. This is when we want to go nowhere and stand still.
        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 10
        });

        // This is the animation for the character's movement. This is when we want to go right.
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        // We need to add collision between the character and the plaform.
        this.physics.add.collider(this.player, this.platforms);

        // Here we create cursor for movement.
        this.cursors = this.input.keyboard.createCursorKeys();

        // This part of the code is about stars and scoring systems.
        this.scoreText = this.add.text(32, 32, 'Score: 0', { fontSize: '32px', fill: '#ffffff' });
        this.starsGroup = this.physics.add.group();
        this.specialstarsGroup = this.physics.add.group();
        this.physics.add.collider(this.starsGroup, this.platforms);
        this.physics.add.collider(this.specialstarsGroup, this.platforms);
        this.physics.add.overlap(this.player, this.starsGroup, this.collectStar, null, this);
        this.physics.add.overlap(this.player, this.specialstarsGroup, this.collectSpecialStar, null, this);
        this.stolenStarsText = this.add.text(32, 64, 'Stolen Stars: 0', { fontSize: '32px', fill: '#ffffff' });
        this.stolenStarsText.setText('Stolen Stars: ' + this.stolenStars);


        // We need a timer so that a normal star will appear after a time.
        this.time.addEvent({
            callback: this.addStar,
            callbackScope: this,
            delay: 1000,
            loop: true
        });

        //For a special star, it will take longer to appear.
        this.time.addEvent({
            callback: this.addSpecialStar,
            callbackScope: this,
            delay: 10000,
            loop: true
        });

        // Here, we implement an enemy group which will try to steal our stars.
        this.enemiesGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false,
        });

        // The first enemy will not be spawn immediately but rather after 10 secs.
        this.time.delayedCall(10000, () => {
            this.spawnEnemy();
            this.time.addEvent({
                delay: 3000, // Enemies will spawn every 3 seconds
                callback: this.spawnEnemy,
                callbackScope: this,
                loop: true
            });
        }, [], this);

        // This part of the code is where we implement overlapping for enemies and stars.
        this.physics.add.overlap(this.enemiesGroup, this.starsGroup, this.stealStar, null, this);
        this.physics.add.overlap(this.enemiesGroup, this.specialstarsGroup, this.stealStar, null, this);

        //This is for the fireball and shooting.
        this.fireballsGroup = this.physics.add.group();
        this.physics.add.overlap(this.fireballsGroup, this.enemiesGroup, this.hitEnemy, null, this);
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    spawnEnemy() {
        console.log("Spawning enemy!");
        const xPosition = Phaser.Math.Between(0, game.config.width); // We want the enemy to spawn randomly on the ground horizontally.
        const enemy = this.enemiesGroup.create(xPosition, 600, 'enemy'); 

        enemy.setScale(0.1); // Here, we define the size of enemy.
        enemy.setCollideWorldBounds(false);
        enemy.body.immovable = true;

        // We set random velocity for the enemy to move.
        enemy.setVelocityX(Phaser.Math.Between(-150, 150));
    }

    stealStar(enemy, star) {
        console.log("Star stolen by enemy!");
        star.disableBody(true, true); // The star will be removed when stolen.
        this.score -= 1; // The number of stars will decrease by one.
        this.stolenStars += 1;    //And the number of stolen stars will increase by one.
        this.scoreText.setText('Total score: ' + this.score); // The score is updated here.

        this.stolenStarsText.setText('Total stolen stars: ' + this.stolenStars);

        if (this.stolenStars >= 5) {
            this.gameOver();  // When the stolen stars is five, the game will be over.
        }
    
    }


    //We need this function to spawn the stars.
    addStar() {
        const star = this.starsGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'star');
        star.setVelocityY(gameOptions.dudeSpeed/2);
        star.setScale(0.5);
    }

    //This is the function to collect stars.
    collectStar(player, star) {
        star.disableBody(true, true); // Stars will remove from the scene when collected.
        this.score += 1; 
        this.scoreText.setText('Score: ' + this.score); 
    }

    //This is for the special star.
    addSpecialStar() {
        const specialstar = this.specialstarsGroup.create(Phaser.Math.Between(0, game.config.width), 0, 'specialstar');
        specialstar.setVelocityY(gameOptions.dudeSpeed/2);
    }

    collectSpecialStar(player, specialstar) {
        specialstar.disableBody(true, true); // Remove star
        this.score += 3; // Increase score
        this.scoreText.setText('Score: ' + this.score); // Update score display
    }

    shootFireball() {
        // We create a fireball from the position of the player.
        const fireball = this.fireballsGroup.create(this.player.x, this.player.y, 'fireball');
        fireball.setScale(0.2);

    // Initially, the character was only shooting fireball from right so I had to add conditions.
    if (this.playerFacingRight) {
        fireball.setVelocityX(400);  // Shoot to the right
        fireball.setFlipX(false);   
    } else {
        fireball.setVelocityX(-400); // Shoot to the left
        fireball.setFlipX(true);   
    }

    
    }

    //When the fireball hits the enemy, both the enemy and the fireball will be removed.
    hitEnemy(fireball, enemy) {
        fireball.destroy(); 
        enemy.destroy(); 
    }
    

    //This function is important because the game needs to be updated after every action.
    update() {
        // This is how we move our character.
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-gameOptions.dudeSpeed);
            this.player.anims.play('left', true);
            this.playerFacingRight = false;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(gameOptions.dudeSpeed);
            this.player.anims.play('right', true);
            this.playerFacingRight = true;
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        // Player can jump only when touching the ground
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-gameOptions.dudeGravity / 1.6);
        }

        //This is to shoot fireballs.
        if (Phaser.Input.Keyboard.JustDown(this.shootKey)) {
            this.shootFireball();
        }
    }

    //This is the function when we lose game.
    gameOver() {
       
        this.add.text(550, 300, 'Game Over', { fontSize: '100px', fill: '#ff0000' }).setOrigin(0.5);
    
        // Everything in the game will stop.
        this.physics.pause();    
        this.player.setTint(0xff0000); // The character will turn red when the game is over X_x
        this.player.anims.play('turn');
    
        // The game will restart again after 2 secs.
        this.time.delayedCall(2000, () => {
            this.scene.restart(); 
        }, [], this);
    }
}