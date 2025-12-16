/*
  Mediband ESP32 Firmware
  
  Required Library: PulseSensor Playground by Joel Murphy and Yury Gitman
  Install via Arduino Library Manager.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED CONFIGURATION
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WIFI CONFIGURATION
const char* ssid = "User";
const char* password = "12345678";

// API CONFIGURATION
const char* serverUrl = "https://mediband-eight.vercel.app/api/receive";

const int BUTTON_PIN = 0; // Boot button is GPIO 0
bool lastButtonState = HIGH;

// State Machine
enum State { IDLE, MEASURING, COMPLETED };
State currentState = IDLE;

unsigned long measurementStartTime = 0;
const unsigned long MEASUREMENT_DURATION = 15000; // 15 seconds

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  
  // Connect to WiFi (Hidden from OLED)
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected, IP address: ");
  Serial.println(WiFi.localIP());

  showIntro();
}

void showIntro() {
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  
  // Center "MEDIBAND"
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds("MEDIBAND", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2 - 10);
  display.println("MEDIBAND");
  
  display.setTextSize(1);
  const char* sub = "Press BOOT to Start";
  display.getTextBounds(sub, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, SCREEN_HEIGHT - 15);
  display.println(sub);
  
  display.display();
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);

  // Handle Button Press to Start (Simple Debounce)
  if (buttonState == LOW && lastButtonState == HIGH && currentState == IDLE) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      currentState = MEASURING;
      measurementStartTime = millis();
    }
  }
  lastButtonState = buttonState;

  if (currentState == MEASURING) {
    unsigned long currentMillis = millis();
    unsigned long elapsed = currentMillis - measurementStartTime;
    unsigned long remaining = MEASUREMENT_DURATION > elapsed ? MEASUREMENT_DURATION - elapsed : 0;
    
    if (elapsed >= MEASUREMENT_DURATION) {
      currentState = COMPLETED;
      showIntro(); 
      currentState = IDLE;
      return;
    }

    // Generate Dynamic Mock BPM
    int bpm = 75 + random(-5, 6) + (sin(elapsed / 1000.0) * 10);
    
    // Pulse Animation Logic
    bool beat = (elapsed % 800) < 100; 
    int radius = beat ? 8 : 6;

    // Update Display (Throttle to ~30 FPS)
    static unsigned long lastDisplayUpdate = 0;
    if (currentMillis - lastDisplayUpdate > 33) {
      lastDisplayUpdate = currentMillis;
      
      display.clearDisplay();
      
      // Timer Bar
      int barWidth = map(elapsed, 0, MEASUREMENT_DURATION, 0, SCREEN_WIDTH);
      display.fillRect(0, 0, barWidth, 4, SSD1306_WHITE);
      
      // BPM Display
      display.setTextSize(3);
      display.setCursor(10, 20);
      display.print(bpm);
      display.setTextSize(1);
      display.print(" BPM");

      // Timer Text
      display.setCursor(10, 50);
      display.print("Time: ");
      display.print(remaining / 1000);
      display.print("s");

      // Heart Icon
      display.fillCircle(100, 35, radius, SSD1306_WHITE);
      if (beat) {
         display.drawCircle(100, 35, radius + 3, SSD1306_WHITE);
      }

      display.display();
    }

    // Send Data to API (Every 1s)
    static unsigned long lastDataSend = 0;
    if (currentMillis - lastDataSend > 1000) {
       lastDataSend = currentMillis;
       sendData(bpm);
    }
  }
  
  // No delay needed if we use non-blocking timers, but a small one saves power
  delay(10); 
}

void sendData(int bpm) {
  if(WiFi.status()== WL_CONNECTED){
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      
      String jsonPayload = "{\"bpm\": " + String(bpm) + ", \"status\": \"MEASURING\"}";
      
      int httpResponseCode = http.POST(jsonPayload);
      
      if(httpResponseCode > 0){
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
      }
      http.end();
  }
}
