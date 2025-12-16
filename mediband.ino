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
const char* serverUrl = "https://YOUR_VERCEL_APP.vercel.app/api/receive";

const int BUTTON_PIN = 0; // Boot button is GPIO 0
bool lastButtonState = HIGH;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initialize OLED
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
    for(;;);
  }
  
  // Show Boot Screen
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("Mediband Ready");
  display.println("Press BOOT to scan");
  display.display();

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
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);

  // Check for button press (LOW when pressed)
  if (buttonState == LOW && lastButtonState == HIGH) {
    Serial.println("Button Pressed! Generating Mock Data...");
    
    // Generate Mock BPM (60-100)
    int mockBPM = random(60, 100);
    
    // Update OLED
    display.clearDisplay();
    display.setTextSize(2);
    display.setCursor(0,0);
    display.print("BPM: ");
    display.println(mockBPM);
    display.setTextSize(1);
    display.println("Status: SENDING...");
    display.display();

    // Send to API
    if(WiFi.status()== WL_CONNECTED){
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      
      String jsonPayload = "{\"bpm\": " + String(mockBPM) + ", \"status\": \"MEASURING\"}";
      
      int httpResponseCode = http.POST(jsonPayload);
      
      if(httpResponseCode > 0){
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
        display.println("SENT!");
      } else {
        Serial.print("Error code: ");
        Serial.println(httpResponseCode);
        display.println("ERROR!");
      }
      display.display();
      http.end();
    }
    
    delay(1000); // Debounce / Wait
    
    // Reset Screen
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0,0);
    display.println("Mediband Ready");
    display.println("Press BOOT to scan");
    display.display();
  }

  lastButtonState = buttonState;
  delay(50);
}
