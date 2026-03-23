package com.ecommerce.product.model;

import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "products")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Product {
    @Id private String id;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(min = 2, max = 200)
    private String name;

    @NotBlank private String description;

    @NotNull @DecimalMin("0.01")
    private BigDecimal price;

    @NotNull @Min(0)
    private Integer stockQuantity;

    @NotBlank private String category;
    private List<String> imageUrls;
    private Map<String, String> attributes;
    private boolean active = true;

    @CreatedDate private LocalDateTime createdAt;
    @LastModifiedDate private LocalDateTime updatedAt;
    @CreatedBy private String createdBy;
}
