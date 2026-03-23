package com.ecommerce.order.controller;

import com.ecommerce.order.model.Order;
import com.ecommerce.order.model.OrderStatus;
import com.ecommerce.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderRepository repository;

    // ── Utilisateur: ses commandes ───────────────────────────────────

    @GetMapping
    public ResponseEntity<List<Order>> myOrders(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return ResponseEntity.ok(repository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable String id,
                                          @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return repository.findByIdAndUserId(id, userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody CreateOrderRequest req,
                                             @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        BigDecimal total = req.items().stream()
            .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Order.OrderItem> items = req.items().stream()
            .map(i -> Order.OrderItem.builder()
                .productId(i.productId())
                .productName(i.productName())
                .price(i.price())
                .quantity(i.quantity())
                .build())
            .toList();

        Order order = Order.builder()
            .userId(userId)
            .items(items)
            .total(total)
            .status(OrderStatus.CONFIRMED)
            .shippingAddress(Order.Address.builder()
                .street(req.shippingAddress().street())
                .city(req.shippingAddress().city())
                .postalCode(req.shippingAddress().postalCode())
                .country(req.shippingAddress().country())
                .build())
            .paymentMethod(req.paymentMethod())
            .transactionId("TXN-" + System.currentTimeMillis())
            .build();

        Order saved = repository.save(order);
        log.info("Commande créée: {} pour user: {}", saved.getId(), userId);
        return ResponseEntity
            .created(URI.create("/api/v1/orders/" + saved.getId()))
            .body(saved);
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Order> cancelOrder(@PathVariable String id,
                                             @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return repository.findByIdAndUserId(id, userId)
            .filter(o -> o.getStatus() == OrderStatus.PENDING
                      || o.getStatus() == OrderStatus.CONFIRMED)
            .map(o -> {
                o.setStatus(OrderStatus.CANCELLED);
                return ResponseEntity.ok(repository.save(o));
            })
            .orElse(ResponseEntity.status(HttpStatus.CONFLICT).build());
    }

    // ── Admin: toutes les commandes ──────────────────────────────────

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Order>> allOrders() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PatchMapping("/admin/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Order> updateStatus(@PathVariable String id,
                                              @RequestBody Map<String, String> body) {
        return repository.findById(id)
            .map(o -> {
                o.setStatus(OrderStatus.valueOf(body.get("status")));
                return ResponseEntity.ok(repository.save(o));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Records ──────────────────────────────────────────────────────

    public record CreateOrderRequest(
        List<OrderItemRequest> items,
        AddressRequest shippingAddress,
        String paymentMethod
    ) {}

    public record OrderItemRequest(
        String productId,
        String productName,
        BigDecimal price,
        Integer quantity
    ) {}

    public record AddressRequest(
        String street, String city,
        String postalCode, String country
    ) {}
}
