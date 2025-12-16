/*
  Mediband ESP32 Firmware
  
  Required Library: PulseSensor Playground by Joel Murphy and Yury Gitman
  Install via Arduino Library Manager.
*/

#define USE_ARDUINO_INTERRUPTS true
#include <PulseSensorPlayground.h>
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
// Replace with your deployed Vercel URL
const char* serverUrl = "https://YOUR_VERCEL_APP.vercel.app/api/receive";

const int PulseWire = 34; // PulseSensor PURPLE WIRE connected to ANALOG PIN 34
const int LED13 = 2;      // The on-board Arduino LED (usually GPIO 2 on ESP32)
int Threshold = 550;      // Determine which Signal to "count as a beat" and which to ignore.

PulseSensorPlayground pulseSensor;

void setup() {
  Serial.begin(115200);

  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("Booting Mediband...");
  display.display();

  // Configure PulseSensor
  pulseSensor.analogInput(PulseWire);
  pulseSensor.blinkOnPulse(LED13);
  pulseSensor.setThreshold(Threshold);

  if (pulseSensor.begin()) {
    Serial.println("We created a pulseSensor Object !");
  }

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("Connecting WiFi...");
  display.display();
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected, IP address: ");
  Serial.println(WiFi.localIP());
  
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("WiFi Connected!");
  display.println(WiFi.localIP());
  display.display();
  delay(2000);
}

void loop() {
  int myBPM = pulseSensor.getBeatsPerMinute();

  if (pulseSensor.sawStartOfBeat()) {
    Serial.println("♥  A HeartBeat Happened ! ");
    Serial.print("BPM: ");
    Serial.println(myBPM);

    // Update OLED
    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(0,0);
    display.print("BPM: ");
    display.println(myBPM);
    display.setTextSize(1);
    display.println("Status: MEASURING");
    display.display();

    if(WiFi.status()== WL_CONNECTED){
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      
      String jsonPayload = "{\"bpm\": " + String(myBPM) + ", \"status\": \"MEASURING\"}";
      
      int httpResponseCode = http.POST(jsonPayload);
      
      if(httpResponseCode > 0){
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
      } else {
        Serial.print("Error code: ");
        Serial.println(httpResponseCode);
      }
      http.end();
    }
  }

  delay(20);
}
