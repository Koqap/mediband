/*
  Mediband ESP32 Firmware
  
  Required Library: PulseSensor Playground by Joel Murphy and Yury Gitman
  Install via Arduino Library Manager.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
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
const char* ssid = "nyeahhh";
const char* password = "shantel123";

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
String lastCommandPayload = "";

// EKG Graph Buffer
#define GRAPH_HEIGHT 20
#define GRAPH_Y 44
int ekgBuffer[SCREEN_WIDTH];
int ekgIndex = 0;
int lastBpm = 75;

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
  // Show a simple loading bar while connecting
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(20, 30);
  display.println("Connecting...");
  display.display();

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  Serial.println();
  Serial.print("Connected, IP address: ");
  Serial.println(WiFi.localIP());

  playStartupAnimation();
  showIdleScreen();
}

void playStartupAnimation() {
  // Zoom-in Effect for "MEDIBAND"
  for (int size = 1; size <= 2; size++) {
    display.clearDisplay();
    display.setTextSize(size);
    display.setTextColor(SSD1306_WHITE);
    
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds("MEDIBAND", 0, 0, &x1, &y1, &w, &h);
    display.setCursor((SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2 - 10);
    display.println("MEDIBAND");
    display.display();
    delay(300);
  }

  // EKG Trace Animation
  int yBase = SCREEN_HEIGHT - 20;
  for (int x = 0; x < SCREEN_WIDTH; x+=2) {
      // Simple spike logic
      int y = yBase;
      if (x % 40 > 30 && x % 40 < 35) y -= 10; // QRS complex spike
      if (x % 40 > 35 && x % 40 < 38) y += 5;
      
      display.drawPixel(x, y, SSD1306_WHITE);
      display.display();
      delay(5);
  }
  
  delay(500);
}

void showIdleScreen() {
  display.clearDisplay();
  
  // Border
  display.drawRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, SSD1306_WHITE);
  
  // Title
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds("MEDIBAND", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 10);
  display.println("MEDIBAND");
  
  // Status
  display.setTextSize(1);
  const char* status = "SYSTEM READY";
  display.getTextBounds(status, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 35);
  display.println(status);

  // Instruction
  const char* sub = "[PRESS BOOT]";
  display.getTextBounds(sub, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 50);
  display.println(sub);
  
  display.display();
}

void showResult(int bpm) {
  display.clearDisplay();
  
  // Header Box
  display.fillRect(0, 0, SCREEN_WIDTH, 16, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(40, 4);
  display.println("COMPLETED");
  
  // BPM Result
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(10, 25);
  display.print("AVG BPM:");
  display.setTextSize(2);
  display.setCursor(70, 20);
  display.print(bpm);

  // Risk Level (Inverted Box)
  String risk = "NORMAL";
  if (bpm < 60 || bpm > 100) risk = "WARNING";
  if (bpm < 40 || bpm > 120) risk = "CRITICAL";
  
  int16_t x1, y1;
  uint16_t w, h;
  display.setTextSize(1);
  display.getTextBounds(risk, 0, 0, &x1, &y1, &w, &h);
  
  // Draw Box for Risk
  int boxX = (SCREEN_WIDTH - w) / 2 - 4;
  int boxY = 45;
  int boxW = w + 8;
  int boxH = h + 6;
  
  display.fillRect(boxX, boxY, boxW, boxH, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setCursor(boxX + 4, boxY + 3);
  display.print(risk);
  
  display.display();
  delay(10000); // Show result for 10 seconds
}

void startMeasurement(unsigned long startTime) {
  Serial.println("Starting Measurement...");
  currentState = MEASURING;
  measurementStartTime = startTime;
  ekgIndex = 0; // Reset graph
  // Fill buffer with flat line
  for(int i=0; i<SCREEN_WIDTH; i++) ekgBuffer[i] = GRAPH_Y + GRAPH_HEIGHT/2;
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);
  unsigned long currentMillis = millis();

  // Handle Button Press to Start (Simple Debounce)
  if (buttonState == LOW && lastButtonState == HIGH && currentState == IDLE) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      Serial.println("Button Triggered Start");
      startMeasurement(currentMillis);
    }
  }
  lastButtonState = buttonState;

  // Poll for Web Commands (every 1s)
  if (currentState == IDLE && (currentMillis - lastCommandCheck > 1000)) {
    lastCommandCheck = currentMillis;
    checkForCommand(currentMillis);
  }

  if (currentState == MEASURING) {
    // Safety check to prevent underflow if time wrapped or logic is off
    if (currentMillis < measurementStartTime) measurementStartTime = currentMillis;
    
    unsigned long elapsed = currentMillis - measurementStartTime;
    unsigned long remaining = MEASUREMENT_DURATION > elapsed ? MEASUREMENT_DURATION - elapsed : 0;
    
    if (elapsed >= MEASUREMENT_DURATION) {
      currentState = COMPLETED;
      sendData(lastBpm, 0, "COMPLETED"); // Notify server that we are done
      showResult(lastBpm); 
      showIdleScreen();
      currentState = IDLE;
      return;
    }

    // Generate Dynamic Mock BPM
    int bpm = 75 + random(-5, 6) + (sin(elapsed / 1000.0) * 10);
    lastBpm = bpm; // Update last BPM
    
    // Pulse Animation Logic (Synced to BPM)
    long beatInterval = 60000 / bpm;
    bool beat = (currentMillis % beatInterval) < 100; 
    int radius = beat ? 6 : 4;

    // Update EKG Buffer
    // Generate a waveform value
    float phase = (float)(currentMillis % beatInterval) / beatInterval;
    int signal = 0;
    if (phase > 0.1 && phase < 0.2) signal = -5; // Q
    else if (phase >= 0.2 && phase < 0.3) signal = 15; // R
    else if (phase >= 0.3 && phase < 0.4) signal = -5; // S
    else if (phase > 0.6 && phase < 0.8) signal = 5; // T
    
    // Add some noise
    signal += random(-2, 3);
    
    ekgBuffer[ekgIndex] = (GRAPH_Y + GRAPH_HEIGHT/2) - signal;
    ekgIndex = (ekgIndex + 1) % SCREEN_WIDTH;


    // Update Display (Throttle to ~30 FPS)
    static unsigned long lastDisplayUpdate = 0;
    if (currentMillis - lastDisplayUpdate > 33) {
      lastDisplayUpdate = currentMillis;
      
      display.clearDisplay();
      
      // Top Bar: Timer
      display.drawLine(0, 10, SCREEN_WIDTH, 10, SSD1306_WHITE);
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      display.setCursor(0, 0);
      display.print("SCANNING...");
      display.setCursor(90, 0);
      display.print(remaining / 1000);
      display.print("s");
      
      // Middle: Large BPM
      display.setTextSize(3);
      display.setCursor(35, 18);
      display.print(bpm);
      display.setTextSize(1);
      display.setCursor(95, 32);
      display.print("BPM");

      // Heart Icon (Left side)
      display.fillCircle(15, 28, radius, SSD1306_WHITE);
      if (beat) {
         display.drawCircle(15, 28, radius + 3, SSD1306_WHITE);
      }
      
      // Draw EKG Graph (Bottom)
      for (int i = 0; i < SCREEN_WIDTH; i++) {
        int index = (ekgIndex + i) % SCREEN_WIDTH;
        int y = ekgBuffer[index];
        // Clamp y
        if (y < GRAPH_Y) y = GRAPH_Y;
        if (y > GRAPH_Y + GRAPH_HEIGHT) y = GRAPH_Y + GRAPH_HEIGHT;
        display.drawPixel(i, y, SSD1306_WHITE);
      }

      display.display();
    }

    // Send Data to API (Every 1s)
    static unsigned long lastDataSend = 0;
    if (currentMillis - lastDataSend > 1000) {
       lastDataSend = currentMillis;
       sendData(bpm, remaining / 1000, "MEASURING");
    }
  }
  
  delay(10); 
}

void checkForCommand(unsigned long now) {
  if(WiFi.status()== WL_CONNECTED){
      WiFiClientSecure client;
      client.setInsecure(); // Ignore SSL certificate errors
      
      HTTPClient http;
      http.begin(client, commandUrl);
      
      int httpResponseCode = http.GET();
      
      if(httpResponseCode > 0){
        String payload = http.getString();
        
        // Check if payload is different from last time to avoid loops
        // And check if it contains "START"
        if (payload != lastCommandPayload) {
           lastCommandPayload = payload;
           
           // Debug print
           Serial.print("New Command Payload: ");
           Serial.println(payload);

           if (payload.indexOf("START") >= 0) {
              Serial.println("Received START command from Web");
              startMeasurement(now);
           }
        }
      } else {
        Serial.print("Error on HTTP request: ");
        Serial.println(httpResponseCode);
      }
      http.end();
  }
}

void sendData(int bpm, int timeLeft, String statusLabel) {
  if(WiFi.status()== WL_CONNECTED){
      WiFiClientSecure client;
      client.setInsecure(); // Ignore SSL certificate errors

      HTTPClient http;
      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");
      
      String jsonPayload = "{\"bpm\": " + String(bpm) + ", \"status\": \"" + statusLabel + "\", \"timeLeft\": " + String(timeLeft) + "}";
      
      int httpResponseCode = http.POST(jsonPayload);
      
      if(httpResponseCode > 0){
        // Serial.print("HTTP Response code: ");
        // Serial.println(httpResponseCode);
      } else {
        Serial.print("Error sending data: ");
        Serial.println(httpResponseCode);
      }
      http.end();
  }
}
