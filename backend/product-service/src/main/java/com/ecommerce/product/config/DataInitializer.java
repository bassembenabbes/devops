package com.ecommerce.product.config;

import com.ecommerce.product.model.Product;
import com.ecommerce.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final ProductRepository repository;

    @Override
    public void run(String... args) {
        // Retry jusqu'à ce que MongoDB soit prêt (max 2 min)
        int maxAttempts = 24;
        int attempt = 0;
        while (attempt < maxAttempts) {
            try {
                if (repository.count() == 0) {
                    log.info("Initialisation des données de démonstration...");
                    repository.saveAll(demoProducts());
                    log.info("{} produits créés", repository.count());
                } else {
                    log.info("Données déjà présentes ({} produits)", repository.count());
                }
                return; // Succès
            } catch (Exception e) {
                attempt++;
                if (attempt >= maxAttempts) {
                    log.warn("MongoDB indisponible après {} tentatives — données non initialisées", maxAttempts);
                    return;
                }
                log.info("MongoDB pas encore prêt (tentative {}/{}) — retry dans 5s", attempt, maxAttempts);
                try { Thread.sleep(5000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return; }
            }
        }
    }

    private List<Product> demoProducts() {
        return List.of(
            Product.builder().name("iPhone 15 Pro").description("Smartphone Apple — puce A17 Pro, titane, 48MP")
                .price(new BigDecimal("1199.99")).stockQuantity(50).category("Smartphones")
                .imageUrls(List.of("https://picsum.photos/seed/iphone/400/300"))
                .attributes(Map.of("Stockage","256GB","Couleur","Titane naturel","5G","Oui")).active(true).build(),
            Product.builder().name("Samsung Galaxy S24 Ultra").description("Smartphone Samsung — S Pen intégré, 200MP")
                .price(new BigDecimal("1329.99")).stockQuantity(35).category("Smartphones")
                .imageUrls(List.of("https://picsum.photos/seed/samsung/400/300"))
                .attributes(Map.of("Stockage","512GB","RAM","12GB","S-Pen","Oui")).active(true).build(),
            Product.builder().name("MacBook Pro 14\" M3 Pro").description("Ordinateur portable Apple — puce M3 Pro")
                .price(new BigDecimal("2199.99")).stockQuantity(20).category("Laptops")
                .imageUrls(List.of("https://picsum.photos/seed/laptop/400/300"))
                .attributes(Map.of("CPU","M3 Pro 11 cœurs","RAM","18GB","Stockage","512GB SSD")).active(true).build(),
            Product.builder().name("Dell XPS 15 9530").description("Laptop premium Intel Core i9 — écran OLED 4K")
                .price(new BigDecimal("1899.99")).stockQuantity(15).category("Laptops")
                .imageUrls(List.of("https://picsum.photos/seed/laptop2/400/300"))
                .attributes(Map.of("CPU","Core i9-13900H","RAM","32GB","GPU","RTX 4070","Écran","OLED 4K")).active(true).build(),
            Product.builder().name("iPad Pro 13\" M4").description("Tablette Apple — écran Ultra Retina XDR OLED")
                .price(new BigDecimal("1299.99")).stockQuantity(25).category("Tablettes")
                .imageUrls(List.of("https://picsum.photos/seed/ipad/400/300"))
                .attributes(Map.of("CPU","M4","Stockage","256GB","Connectivité","WiFi 6E + 5G")).active(true).build(),
            Product.builder().name("Sony WH-1000XM5").description("Casque audio ANC — meilleure réduction de bruit du marché")
                .price(new BigDecimal("349.99")).stockQuantity(80).category("Audio")
                .imageUrls(List.of("https://picsum.photos/seed/headphones2/400/300"))
                .attributes(Map.of("ANC","30dB","Autonomie","30h","Bluetooth","5.2")).active(true).build(),
            Product.builder().name("AirPods Pro 2").description("Écouteurs Apple — ANC adaptatif, audio spatial")
                .price(new BigDecimal("279.99")).stockQuantity(100).category("Audio")
                .imageUrls(List.of("https://picsum.photos/seed/headphones/400/300"))
                .attributes(Map.of("ANC","Adaptatif","Autonomie","6h + 30h étui","Chip","H2")).active(true).build(),
            Product.builder().name("LG OLED C3 55\"").description("TV OLED 4K 120Hz — gaming et cinéma")
                .price(new BigDecimal("1299.99")).stockQuantity(12).category("TV & Écrans")
                .imageUrls(List.of("https://picsum.photos/seed/tv/400/300"))
                .attributes(Map.of("Résolution","4K OLED","Taux","120Hz","HDR","Dolby Vision IQ","HDMI","4x 2.1")).active(true).build(),
            Product.builder().name("PlayStation 5 Slim").description("Console Sony — SSD ultra-rapide, ray tracing")
                .price(new BigDecimal("449.99")).stockQuantity(8).category("Gaming")
                .imageUrls(List.of("https://picsum.photos/seed/ps5/400/300"))
                .attributes(Map.of("Stockage","1TB SSD","4K","60/120fps","Ray Tracing","Oui")).active(true).build(),
            Product.builder().name("Nintendo Switch OLED").description("Console portable/salon — écran OLED 7\"")
                .price(new BigDecimal("349.99")).stockQuantity(30).category("Gaming")
                .imageUrls(List.of("https://picsum.photos/seed/nintendo/400/300"))
                .attributes(Map.of("Écran","OLED 7\"","Autonomie","4.5-9h","Stockage","64GB")).active(true).build(),
            Product.builder().name("Samsung 980 Pro 2TB").description("SSD NVMe PCIe 4.0 — 7000 Mo/s en lecture")
                .price(new BigDecimal("149.99")).stockQuantity(60).category("Stockage")
                .imageUrls(List.of("https://picsum.photos/seed/ssd/400/300"))
                .attributes(Map.of("Capacité","2TB","Lecture","7000 MB/s","Écriture","6900 MB/s","Interface","PCIe 4.0")).active(true).build(),
            Product.builder().name("Logitech MX Master 3S").description("Souris sans fil premium — scroll électromagnétique")
                .price(new BigDecimal("99.99")).stockQuantity(45).category("Périphériques")
                .imageUrls(List.of("https://picsum.photos/seed/mouse/400/300"))
                .attributes(Map.of("DPI","8000","Autonomie","70 jours","Connexion","Bluetooth + USB")).active(true).build()
        );
    }
}
