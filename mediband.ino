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
const char* commandUrl = "https://mediband-eight.vercel.app/api/command";

const int BUTTON_PIN = 0; // Boot button is GPIO 0
bool lastButtonState = HIGH;

// State Machine
enum State { IDLE, MEASURING, COMPLETED };
State currentState = IDLE;

unsigned long measurementStartTime = 0;
const unsigned long MEASUREMENT_DURATION = 15000; // 15 seconds
unsigned long lastCommandCheck = 0;
unsigned long lastCommandTimestamp = 0;

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
  unsigned long currentMillis = millis();

  // Handle Button Press to Start (Simple Debounce)
  if (buttonState == LOW && lastButtonState == HIGH && currentState == IDLE) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      currentState = MEASURING;
      measurementStartTime = currentMillis;
    }
  }
  lastButtonState = buttonState;

  // Poll for Web Commands (every 1s)
  if (currentState == IDLE && (currentMillis - lastCommandCheck > 1000)) {
    lastCommandCheck = currentMillis;
    checkForCommand();
  }

  if (currentState == MEASURING) {
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

void checkForCommand() {
  if(WiFi.status()== WL_CONNECTED){
      HTTPClient http;
      http.begin(commandUrl);
      int httpResponseCode = http.GET();
      
      if(httpResponseCode > 0){
        String payload = http.getString();
        // Simple parsing for "command":"START" and timestamp
        // In a real app, use ArduinoJson
        if (payload.indexOf("\"command\":\"START\"") > 0) {
           // Extract timestamp (simple hacky way or just check if it changed)
           // For now, let's just trigger if we see it and it's "fresh" enough logic would be complex without JSON lib
           // Let's assume if we see START we go, but we need to avoid looping.
           // Ideally we parse timestamp.
           // For this demo, let's just trigger.
           // To avoid loop, we can check if payload changed?
           // Or just rely on the fact that we clear it? No we don't clear it.
           // Let's parse timestamp roughly.
           int timeIdx = payload.indexOf("\"timestamp\":");
           if (timeIdx > 0) {
             String tsStr = payload.substring(timeIdx + 12);
             unsigned long ts = strtoul(tsStr.c_str(), NULL, 10); // This might overflow 32bit long on ESP32? 
             // JS timestamp is ms, so it's huge. ESP32 unsigned long is 32 bit.
             // We need 64 bit. `unsigned long long`
             // Let's just use string comparison or check if it's different from last.
             if (tsStr != String(lastCommandTimestamp)) {
                // New command!
                // lastCommandTimestamp = ts; // Store string or value
                // Actually, let's just trigger and assume the web side handles the "freshness" of the request
                // But wait, if Redis holds "START" forever, ESP32 will loop forever.
                // We need to know if it's NEW.
                // Let's just store the full payload string and compare.
                 static String lastPayload = "";
                 if (payload != lastPayload) {
                    lastPayload = payload;
                    // Check if timestamp is recent? 
                    // Let's just trigger.
                    Serial.println("Received START command from Web");
                    currentState = MEASURING;
                    measurementStartTime = millis();
                 }
             }
           }
        }
      }
      http.end();
  }
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
