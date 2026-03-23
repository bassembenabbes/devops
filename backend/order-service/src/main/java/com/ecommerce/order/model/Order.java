package com.ecommerce.order.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "orders")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Order {
    @Id private String id;

    @NotBlank @Indexed
    private String userId;

    @NotEmpty
    private List<OrderItem> items;

    @NotNull @DecimalMin("0.01")
    private BigDecimal total;

    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @NotNull
    private Address shippingAddress;

    private String paymentMethod;
    private String transactionId;

    @CreatedDate  private LocalDateTime createdAt;
    @LastModifiedDate private LocalDateTime updatedAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrderItem {
        private String productId;
        private String productName;
        private BigDecimal price;
        private Integer quantity;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Address {
        private String street;
        private String city;
        private String postalCode;
        private String country;
    }
}
